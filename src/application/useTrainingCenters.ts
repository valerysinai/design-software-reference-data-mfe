import { useCallback, useEffect, useMemo, useState } from 'react';

import { trainingCentersService } from '../adapter/out/http/trainingCentersService.js';
import { MissingReferenceDataConfigurationError, ReferenceDataHttpError } from '../adapter/out/http/referenceDataHttp.js';
import type {
  InstitutionalStructurePaginationDto,
  TrainingCenterCreateDto,
  TrainingCenterDto,
  TrainingCenterUpdateDto,
} from '../domain/institutionalStructure.js';

interface State {
  key: string;
  data: TrainingCenterDto[];
  pagination?: InstitutionalStructurePaginationDto;
  loading: boolean;
  error?: Error;
}

const demoTrainingCenters: TrainingCenterDto[] = [
  {
    id: 'demo-center-1',
    center_code: '9201',
    name: 'Centro de Servicios Financieros',
    municipality_id: 'demo-municipality-bogota',
    phone: '601 546 1500',
    address: 'Carrera 13 No. 65-10',
    is_active: true,
  },
  {
    id: 'demo-center-2',
    center_code: '9302',
    name: 'Centro de Tecnologia de la Manufactura Avanzada',
    municipality_id: 'demo-municipality-medellin',
    phone: '604 444 2800',
    address: 'Calle 104 No. 69-120',
    is_active: false,
  },
];

const buildPagination = (totalItems: number, pageSize: number): InstitutionalStructurePaginationDto => ({
  page: 1,
  page_size: pageSize,
  total_items: totalItems,
  total_pages: totalItems ? 1 : 0,
});

export function useTrainingCenters(baseUrl?: string, isActive?: boolean, initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [revision, setRevision] = useState(0);
  const [demoData, setDemoData] = useState(demoTrainingCenters);
  const key = useMemo(
    () => `${baseUrl ?? ''}|${isActive ?? 'all'}|${page}|${pageSize}`,
    [baseUrl, isActive, page, pageSize],
  );
  const [state, setState] = useState<State>({ key: '', data: [], loading: false });

  useEffect(() => {
    if (!baseUrl) {
      const data = demoData.filter((center) => isActive === undefined || center.is_active === isActive);
      setState({ key, data, pagination: buildPagination(data.length, pageSize), loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ key, data: [], loading: true });
    void trainingCentersService.list(baseUrl, { page, pageSize, isActive }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setState({ key, data: result.data, pagination: result.pagination, loading: false });
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            key,
            data: [],
            loading: false,
            error: reason instanceof Error ? reason : new Error(String(reason)),
          });
        }
      });
    return () => controller.abort();
  }, [baseUrl, demoData, isActive, key, page, pageSize, revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const create = useCallback(async (payload: TrainingCenterCreateDto) => {
    if (!baseUrl) {
      if (demoData.some((center) => center.center_code === payload.center_code)) {
        throw new ReferenceDataHttpError('Codigo duplicado.', 409, 'CONFLICT');
      }
      setDemoData((current) => [
        {
          id: `demo-center-${Date.now()}`,
          center_code: payload.center_code,
          name: payload.name,
          municipality_id: payload.municipality_id,
          phone: payload.phone,
          address: payload.address,
          is_active: true,
        },
        ...current,
      ]);
      setPage(1);
      return;
    }
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await trainingCentersService.create(baseUrl, payload);
    setPage(1);
    refresh();
  }, [baseUrl, demoData, refresh]);
  const update = useCallback(async (id: string, payload: TrainingCenterUpdateDto) => {
    if (!baseUrl) {
      setDemoData((current) => current.map((center) => (center.id === id ? { ...center, ...payload } : center)));
      return;
    }
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await trainingCentersService.update(baseUrl, id, payload);
    refresh();
  }, [baseUrl, refresh]);
  const deactivate = useCallback(async (id: string) => {
    if (!baseUrl) {
      setDemoData((current) => current.map((center) => (center.id === id ? { ...center, is_active: false } : center)));
      return;
    }
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await trainingCentersService.deactivate(baseUrl, id);
    refresh();
  }, [baseUrl, refresh]);

  const current = state.key === key
    ? state
    : { key, data: [], loading: Boolean(baseUrl) };
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
    create,
    update,
    deactivate,
  };
}
