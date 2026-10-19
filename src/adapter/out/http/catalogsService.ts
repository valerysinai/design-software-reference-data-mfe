import type {
  CatalogCreateDto,
  CatalogDetailCreateDto,
  CatalogDetailDto,
  CatalogDetailUpdateDto,
  CatalogDto,
  CatalogUpdateDto,
  PageDto,
} from '../../../domain/catalog.js';
import { jsonBody, requestReferenceData } from './referenceDataHttp.js';

export interface CatalogListQuery { page: number; pageSize: number; code?: string; }
export interface CatalogDetailListQuery { page: number; pageSize: number; code?: string; }

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  return search.toString();
};

export const catalogsService = {
  list(baseUrl: string, input: CatalogListQuery, signal?: AbortSignal) {
    return requestReferenceData<PageDto<CatalogDto>>(baseUrl, `catalogs?${query({ page: String(input.page), page_size: String(input.pageSize), code: input.code, is_active: 'true' })}`, { signal });
  },
  create(baseUrl: string, body: CatalogCreateDto) {
    return requestReferenceData<CatalogDto>(baseUrl, 'catalogs', { method: 'POST', body: jsonBody(body) });
  },
  get(baseUrl: string, id: string, signal?: AbortSignal) {
    return requestReferenceData<CatalogDto>(baseUrl, `catalogs/${encodeURIComponent(id)}`, { signal });
  },
  update(baseUrl: string, id: string, body: CatalogUpdateDto) {
    return requestReferenceData<CatalogDto>(baseUrl, `catalogs/${encodeURIComponent(id)}`, { method: 'PUT', body: jsonBody(body) });
  },
  deactivate(baseUrl: string, id: string) {
    return requestReferenceData<void>(baseUrl, `catalogs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  listDetails(baseUrl: string, catalogId: string, input: CatalogDetailListQuery, signal?: AbortSignal) {
    return requestReferenceData<PageDto<CatalogDetailDto>>(baseUrl, `catalogs/${encodeURIComponent(catalogId)}/details?${query({ page: String(input.page), page_size: String(input.pageSize), code: input.code })}`, { signal });
  },
  createDetail(baseUrl: string, catalogId: string, body: CatalogDetailCreateDto) {
    return requestReferenceData<CatalogDetailDto>(baseUrl, `catalogs/${encodeURIComponent(catalogId)}/details`, { method: 'POST', body: jsonBody(body) });
  },
  getDetail(baseUrl: string, catalogId: string, id: string, signal?: AbortSignal) {
    return requestReferenceData<CatalogDetailDto>(baseUrl, `catalogs/${encodeURIComponent(catalogId)}/details/${encodeURIComponent(id)}`, { signal });
  },
  updateDetail(baseUrl: string, catalogId: string, id: string, body: CatalogDetailUpdateDto) {
    return requestReferenceData<CatalogDetailDto>(baseUrl, `catalogs/${encodeURIComponent(catalogId)}/details/${encodeURIComponent(id)}`, { method: 'PUT', body: jsonBody(body) });
  },
  deactivateDetail(baseUrl: string, catalogId: string, id: string) {
    return requestReferenceData<void>(baseUrl, `catalogs/${encodeURIComponent(catalogId)}/details/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

