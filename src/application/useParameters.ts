import { useCallback, useEffect, useMemo, useState } from 'react';
import { parametersService } from '../adapter/out/http/parametersService.js';
import type { ParameterCreateDto, ParameterDto, ParameterUpdateDto, PaginationDto } from '../domain/catalog.js';
import { MissingReferenceDataConfigurationError } from '../adapter/out/http/referenceDataHttp.js';

interface State { key: string; items: ParameterDto[]; pagination?: PaginationDto; loading: boolean; error?: Error; }

export function useParameters(baseUrl?: string, search = '', enabled = true) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const key = useMemo(() => `${baseUrl ?? ''}|${search}|${page}|${pageSize}`, [baseUrl, search, page, pageSize]);
  const [state, setState] = useState<State>({ key: '', items: [], loading: false });
  useEffect(() => {
    if (!baseUrl || !enabled) { setState({ key, items: [], loading: false }); return; }
    const controller = new AbortController();
    setState({ key, items: [], loading: true });
    void parametersService.list(baseUrl, { page, pageSize, key: search.trim() || undefined }, controller.signal).then((result) => {
      if (!controller.signal.aborted) setState({ key, items: result.data, pagination: result.pagination, loading: false });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setState({ key, items: [], loading: false, error: reason instanceof Error ? reason : new Error(String(reason)) });
    });
    return () => controller.abort();
  }, [baseUrl, enabled, key, page, pageSize, revision, search]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const create = useCallback(async (body: ParameterCreateDto) => { if (!baseUrl) throw new MissingReferenceDataConfigurationError(); await parametersService.create(baseUrl, body); setPage(1); refresh(); }, [baseUrl, refresh]);
  const update = useCallback(async (id: string, body: ParameterUpdateDto) => { if (!baseUrl) throw new MissingReferenceDataConfigurationError(); await parametersService.update(baseUrl, id, body); refresh(); }, [baseUrl, refresh]);
  const current = state.key === key ? state : { key, items: [], loading: Boolean(baseUrl && enabled) };
  return { ...current, page, pageSize, setPage: (next: number) => setPage(Math.max(1, next)), setPageSize: (next: number) => { setPageSize(Math.min(100, Math.max(1, next))); setPage(1); }, refresh, create, update };
}

