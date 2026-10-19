import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogsService, type CatalogListQuery } from '../adapter/out/http/catalogsService.js';
import type { CatalogCreateDto, CatalogDto, CatalogUpdateDto, PaginationDto } from '../domain/catalog.js';
import { MissingReferenceDataConfigurationError } from '../adapter/out/http/referenceDataHttp.js';

interface State { key: string; items: CatalogDto[]; pagination?: PaginationDto; loading: boolean; error?: Error; }

export function useCatalogs(baseUrl?: string, search = '') {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const key = useMemo(() => `${baseUrl ?? ''}|${search}|${page}|${pageSize}`, [baseUrl, search, page, pageSize]);
  const [state, setState] = useState<State>({ key: '', items: [], loading: false });

  useEffect(() => {
    if (!baseUrl) { setState({ key, items: [], loading: false }); return; }
    const controller = new AbortController();
    setState({ key, items: [], loading: true });
    const input: CatalogListQuery = { page, pageSize, code: search.trim() || undefined };
    void catalogsService.list(baseUrl, input, controller.signal).then((result) => {
      if (!controller.signal.aborted) setState({ key, items: result.data, pagination: result.pagination, loading: false });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setState({ key, items: [], loading: false, error: reason instanceof Error ? reason : new Error(String(reason)) });
    });
    return () => controller.abort();
  }, [baseUrl, key, page, pageSize, revision, search]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const create = useCallback(async (body: CatalogCreateDto) => { if (!baseUrl) throw new MissingReferenceDataConfigurationError(); await catalogsService.create(baseUrl, body); setPage(1); refresh(); }, [baseUrl, refresh]);
  const update = useCallback(async (id: string, body: CatalogUpdateDto) => { if (!baseUrl) throw new MissingReferenceDataConfigurationError(); await catalogsService.update(baseUrl, id, body); refresh(); }, [baseUrl, refresh]);
  const current = state.key === key ? state : { key, items: [], loading: Boolean(baseUrl) };
  return { ...current, page, pageSize, setPage: (next: number) => setPage(Math.max(1, next)), setPageSize: (next: number) => { setPageSize(Math.min(100, Math.max(1, next))); setPage(1); }, refresh, create, update };
}

