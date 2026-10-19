import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { microregionsService } from '../adapter/out/http/microregionsService.js';
import type { GeographyPaginationDto, MicroregionCreateDto, MicroregionDto, MicroregionUpdateDto } from '../domain/geography.js';
import { MissingReferenceDataConfigurationError } from '../adapter/out/http/referenceDataHttp.js';

interface State {
  key: string;
  data: MicroregionDto[];
  pagination?: GeographyPaginationDto;
  loading: boolean;
  error?: Error;
}

export function useMicroregions(baseUrl?: string, macroregionId?: string) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const previousMacroregionId = useRef(macroregionId);
  const pageForParent = previousMacroregionId.current === macroregionId ? page : 1;
  const key = useMemo(() => `${baseUrl ?? ''}|${macroregionId ?? ''}|${pageForParent}|${pageSize}`, [baseUrl, macroregionId, pageForParent, pageSize]);
  const [state, setState] = useState<State>({ key: '', data: [], loading: false });

  useEffect(() => {
    if (previousMacroregionId.current !== macroregionId) {
      previousMacroregionId.current = macroregionId;
      if (page !== 1) setPage(1);
    }
    if (!baseUrl || !macroregionId) {
      setState({ key, data: [], loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ key, data: [], loading: true });
    void microregionsService.list(baseUrl, { macroregionId, page: pageForParent, pageSize }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result.data, pagination: result.pagination, loading: false });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key, data: [], loading: false, error: reason instanceof Error ? reason : new Error(String(reason)) });
        }
      });
    return () => controller.abort();
  }, [baseUrl, key, macroregionId, page, pageForParent, pageSize, revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const create = useCallback(async (payload: MicroregionCreateDto) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await microregionsService.create(baseUrl, payload);
    setPage(1);
    refresh();
  }, [baseUrl, refresh]);
  const update = useCallback(async (id: string, payload: MicroregionUpdateDto) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await microregionsService.update(baseUrl, id, payload);
    refresh();
  }, [baseUrl, refresh]);
  const deactivate = useCallback(async (id: string) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    await microregionsService.deactivate(baseUrl, id);
    refresh();
  }, [baseUrl, refresh]);
  const getById = useCallback((id: string, signal?: AbortSignal) => {
    if (!baseUrl) throw new MissingReferenceDataConfigurationError();
    return microregionsService.get(baseUrl, id, signal);
  }, [baseUrl]);

  const current = state.key === key ? state : { key, data: [], loading: Boolean(baseUrl && macroregionId) };
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
