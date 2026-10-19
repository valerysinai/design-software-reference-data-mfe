import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { municipalitiesService } from '../adapter/out/http/municipalitiesService.js';
import type { GeographyPaginationDto, MunicipalityCreateDto, MunicipalityDto, MunicipalityUpdateDto } from '../domain/geography.js';
import { MissingReferenceDataConfigurationError } from '../adapter/out/http/referenceDataHttp.js';

interface State {
  key: string;
  data: MunicipalityDto[];
  pagination?: GeographyPaginationDto;
  loading: boolean;
  error?: Error;
}

const demoMunicipalities: MunicipalityDto[] = [
  {
    id: 'demo-municipality-bogota',
    department_id: 'demo-department-cundinamarca',
    name: 'Bogota D.C.',
    dane_code: '11001000',
    is_active: true,
  },
  {
    id: 'demo-municipality-medellin',
    department_id: 'demo-department-antioquia',
    name: 'Medellin',
    dane_code: '05001000',
    is_active: true,
  },
];

export function useMunicipalities(baseUrl?: string, departmentId?: string, includeAll = false) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(includeAll ? 50 : 10);
  const [revision, setRevision] = useState(0);
  const previousDepartmentId = useRef(departmentId);
  const pageForParent = previousDepartmentId.current === departmentId ? page : 1;
  const key = useMemo(() => `${baseUrl ?? ''}|${departmentId ?? ''}|${includeAll}|${pageForParent}|${pageSize}`, [baseUrl, departmentId, includeAll, pageForParent, pageSize]);
  const [state, setState] = useState<State>({ key: '', data: [], loading: false });

  useEffect(() => {
    if (previousDepartmentId.current !== departmentId) {
      previousDepartmentId.current = departmentId;
      if (page !== 1) setPage(1);
    }
    if (!baseUrl) {
      const data = includeAll
        ? demoMunicipalities
        : demoMunicipalities.filter((municipality) => municipality.department_id === departmentId);
      setState({
        key,
        data,
        pagination: { page: 1, page_size: data.length, total_items: data.length, total_pages: data.length ? 1 : 0 },
        loading: false,
      });
      return;
    }
    if (!departmentId && !includeAll) {
      setState({ key, data: [], loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ key, data: [], loading: true });
    void municipalitiesService.list(baseUrl, { ...(departmentId ? { departmentId } : {}), page: pageForParent, pageSize }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result.data, pagination: result.pagination, loading: false });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key, data: [], loading: false, error: reason instanceof Error ? reason : new Error(String(reason)) });
        }
      });
    return () => controller.abort();
  }, [baseUrl, key, departmentId, includeAll, page, pageForParent, pageSize, revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const create = useCallback(async (payload: MunicipalityCreateDto) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await municipalitiesService.create(baseUrl, payload);
    setPage(1);
    refresh();
  }, [baseUrl, refresh]);
  const update = useCallback(async (id: string, payload: MunicipalityUpdateDto) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await municipalitiesService.update(baseUrl, id, payload);
    refresh();
  }, [baseUrl, refresh]);
  const deactivate = useCallback(async (id: string) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await municipalitiesService.deactivate(baseUrl, id);
    refresh();
  }, [baseUrl, refresh]);
  const getById = useCallback((id: string, signal?: AbortSignal) => {
    if (!baseUrl) {
      const municipality = demoMunicipalities.find((item) => item.id === id);
      if (!municipality) throw new Error('No fue posible resolver el municipio del centro.');
      return Promise.resolve(municipality);
    }
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    return municipalitiesService.get(baseUrl, id, signal);
  }, [baseUrl]);

  const current = state.key === key ? state : { key, data: [], loading: Boolean(baseUrl && (departmentId || includeAll)) };
  return {
    items: current.data,
    pagination: current.pagination,
    loading: current.loading,
    error: current.error,
    page,
    pageSize,
    setPage: (nextPage: number) => setPage(Math.max(1, nextPage)),
    setPageSize: (nextSize: number) => { setPageSize(nextSize); setPage(1); },
    refresh,
    getById,
    create,
    update,
    deactivate,
  };
}
