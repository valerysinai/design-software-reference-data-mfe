import { useCallback, useEffect, useMemo, useState } from 'react';

import { macroregionsService } from '../adapter/out/http/macroregionsService.js';
import type { GeographyPaginationDto, MacroregionCreateDto, MacroregionDto, MacroregionUpdateDto } from '../domain/geography.js';
import { MissingReferenceDataConfigurationError } from '../adapter/out/http/referenceDataHttp.js';

interface State {
  key: string;
  data: MacroregionDto[];
  pagination?: GeographyPaginationDto;
  loading: boolean;
  error?: Error;
}

export function useMacroregions(baseUrl?: string) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const key = useMemo(() => `${baseUrl ?? ''}|${page}|${pageSize}`, [baseUrl, page, pageSize]);
  const [state, setState] = useState<State>({ key: '', data: [], loading: false });

  useEffect(() => {
    if (!baseUrl) return;
    const controller = new AbortController();
    setState({ key, data: [], loading: true });
    void macroregionsService.list(baseUrl, { page, pageSize }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result.data, pagination: result.pagination, loading: false });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key, data: [], loading: false, error: reason instanceof Error ? reason : new Error(String(reason)) });
        }
      });
    return () => controller.abort();
  }, [baseUrl, key, page, pageSize, revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const create = useCallback(async (payload: MacroregionCreateDto) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await macroregionsService.create(baseUrl, payload);
    setPage(1);
    refresh();
  }, [baseUrl, refresh]);
  const update = useCallback(async (id: string, payload: MacroregionUpdateDto) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await macroregionsService.update(baseUrl, id, payload);
    refresh();
  }, [baseUrl, refresh]);
  const deactivate = useCallback(async (id: string) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await macroregionsService.deactivate(baseUrl, id);
    refresh();
  }, [baseUrl, refresh]);
  const getById = useCallback((id: string, signal?: AbortSignal) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    return macroregionsService.get(baseUrl, id, signal);
  }, [baseUrl]);

  const current = state.key === key ? state : { key, data: [], loading: Boolean(baseUrl) };
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
