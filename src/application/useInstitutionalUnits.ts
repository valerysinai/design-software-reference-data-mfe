import { useCallback, useEffect, useMemo, useState } from 'react';

import { institutionalUnitsService } from '../adapter/out/http/institutionalUnitsService.js';
import { MissingReferenceDataConfigurationError } from '../adapter/out/http/referenceDataHttp.js';
import type {
  InstitutionalStructurePaginationDto,
  InstitutionalUnitCreateDto,
  InstitutionalUnitDto,
  InstitutionalUnitUpdateDto,
} from '../domain/institutionalStructure.js';

interface State {
  key: string;
  data: InstitutionalUnitDto[];
  pagination?: InstitutionalStructurePaginationDto;
  loading: boolean;
  error?: Error;
}

const demoInstitutionalUnits: InstitutionalUnitDto[] = [
  {
    id: 'demo-unit-1',
    training_center_id: 'demo-center-1',
    name: 'Sede Chapinero',
    unit_type: 'ACADEMIC',
    is_active: true,
  },
  {
    id: 'demo-unit-2',
    training_center_id: 'demo-center-2',
    name: 'Sede Pedregal',
    unit_type: 'MIXED',
    is_active: false,
  },
];

const buildPagination = (totalItems: number, pageSize: number): InstitutionalStructurePaginationDto => ({
  page: 1,
  page_size: pageSize,
  total_items: totalItems,
  total_pages: totalItems ? 1 : 0,
});

export function useInstitutionalUnits(baseUrl?: string, isActive?: boolean, initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [revision, setRevision] = useState(0);
  const [demoData, setDemoData] = useState(demoInstitutionalUnits);
  const key = useMemo(
    () => `${baseUrl ?? ''}|${isActive ?? 'all'}|${page}|${pageSize}`,
    [baseUrl, isActive, page, pageSize],
  );
  const [state, setState] = useState<State>({ key: '', data: [], loading: false });

  useEffect(() => {
    if (!baseUrl) {
      const data = demoData.filter((unit) => isActive === undefined || unit.is_active === isActive);
      setState({ key, data, pagination: buildPagination(data.length, pageSize), loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ key, data: [], loading: true });
    void institutionalUnitsService.list(baseUrl, { page, pageSize, isActive }, controller.signal)
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
  const create = useCallback(async (payload: InstitutionalUnitCreateDto) => {
    if (!baseUrl) {
      setDemoData((current) => [
        { id: `demo-unit-${Date.now()}`, ...payload, is_active: true },
        ...current,
      ]);
      setPage(1);
      return;
    }
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await institutionalUnitsService.create(baseUrl, payload);
    setPage(1);
    refresh();
  }, [baseUrl, refresh]);
  const update = useCallback(async (id: string, payload: InstitutionalUnitUpdateDto) => {
    if (!baseUrl) {
      setDemoData((current) => current.map((unit) => (unit.id === id ? { ...unit, ...payload } : unit)));
      return;
    }
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await institutionalUnitsService.update(baseUrl, id, payload);
    refresh();
  }, [baseUrl, refresh]);
  const deactivate = useCallback(async (id: string) => {
    if (!baseUrl) {
      setDemoData((current) => current.map((unit) => (unit.id === id ? { ...unit, is_active: false } : unit)));
      return;
    }
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await institutionalUnitsService.deactivate(baseUrl, id);
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
