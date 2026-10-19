import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { departmentsService } from '../adapter/out/http/departmentsService.js';
import type { DepartmentCreateDto, DepartmentDto, DepartmentUpdateDto, GeographyPaginationDto } from '../domain/geography.js';
import { MissingReferenceDataConfigurationError } from '../adapter/out/http/referenceDataHttp.js';

interface State {
  key: string;
  data: DepartmentDto[];
  pagination?: GeographyPaginationDto;
  loading: boolean;
  error?: Error;
}

export function useDepartments(baseUrl?: string, microregionId?: string) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const previousMicroregionId = useRef(microregionId);
  const pageForParent = previousMicroregionId.current === microregionId ? page : 1;
  const key = useMemo(() => `${baseUrl ?? ''}|${microregionId ?? ''}|${pageForParent}|${pageSize}`, [baseUrl, microregionId, pageForParent, pageSize]);
  const [state, setState] = useState<State>({ key: '', data: [], loading: false });

  useEffect(() => {
    if (previousMicroregionId.current !== microregionId) {
      previousMicroregionId.current = microregionId;
      if (page !== 1) setPage(1);
    }
    if (!baseUrl || !microregionId) {
      setState({ key, data: [], loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ key, data: [], loading: true });
    void departmentsService.list(baseUrl, { microregionId, page: pageForParent, pageSize }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result.data, pagination: result.pagination, loading: false });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key, data: [], loading: false, error: reason instanceof Error ? reason : new Error(String(reason)) });
        }
      });
    return () => controller.abort();
  }, [baseUrl, key, microregionId, page, pageForParent, pageSize, revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const create = useCallback(async (payload: DepartmentCreateDto) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await departmentsService.create(baseUrl, payload);
    setPage(1);
    refresh();
  }, [baseUrl, refresh]);
  const update = useCallback(async (id: string, payload: DepartmentUpdateDto) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await departmentsService.update(baseUrl, id, payload);
    refresh();
  }, [baseUrl, refresh]);
  const deactivate = useCallback(async (id: string) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await departmentsService.deactivate(baseUrl, id);
    refresh();
  }, [baseUrl, refresh]);
  const getById = useCallback((id: string, signal?: AbortSignal) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    return departmentsService.get(baseUrl, id, signal);
  }, [baseUrl]);

  const current = state.key === key ? state : { key, data: [], loading: Boolean(baseUrl && microregionId) };
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
