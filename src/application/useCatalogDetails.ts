import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogsService, type CatalogDetailListQuery } from '../adapter/out/http/catalogsService.js';
import type { CatalogDetailCreateDto, CatalogDetailDto, CatalogDetailUpdateDto, PaginationDto } from '../domain/catalog.js';
import { MissingReferenceDataConfigurationError } from '../adapter/out/http/referenceDataHttp.js';

interface State { key: string; items: CatalogDetailDto[]; pagination?: PaginationDto; loading: boolean; error?: Error; }

export function useCatalogDetails(baseUrl?: string, catalogId?: string, search = '') {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const key = useMemo(() => `${baseUrl ?? ''}|${catalogId ?? ''}|${search}|${page}|${pageSize}`, [baseUrl, catalogId, search, page, pageSize]);
  const [state, setState] = useState<State>({ key: '', items: [], loading: false });

  useEffect(() => {
    if (!baseUrl || !catalogId) { setState({ key, items: [], loading: false }); return; }
    const controller = new AbortController();
    setState({ key, items: [], loading: true });
    const input: CatalogDetailListQuery = { page, pageSize, code: search.trim() || undefined };
    void catalogsService.listDetails(baseUrl, catalogId, input, controller.signal).then((result) => {
      if (!controller.signal.aborted) setState({ key, items: result.data, pagination: result.pagination, loading: false });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setState({ key, items: [], loading: false, error: reason instanceof Error ? reason : new Error(String(reason)) });
    });
    return () => controller.abort();
  }, [baseUrl, catalogId, key, page, pageSize, revision, search]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const create = useCallback(async (body: CatalogDetailCreateDto) => { if (!baseUrl || !catalogId) throw new MissingReferenceDataConfigurationError(); await catalogsService.createDetail(baseUrl, catalogId, body); setPage(1); refresh(); }, [baseUrl, catalogId, refresh]);
  const update = useCallback(async (id: string, body: CatalogDetailUpdateDto) => { if (!baseUrl || !catalogId) throw new MissingReferenceDataConfigurationError(); await catalogsService.updateDetail(baseUrl, catalogId, id, body); refresh(); }, [baseUrl, catalogId, refresh]);
  const current = state.key === key ? state : { key, items: [], loading: Boolean(baseUrl && catalogId) };
  return { ...current, page, pageSize, setPage: (next: number) => setPage(Math.max(1, next)), setPageSize: (next: number) => { setPageSize(Math.min(100, Math.max(1, next))); setPage(1); }, refresh, create, update };
}

