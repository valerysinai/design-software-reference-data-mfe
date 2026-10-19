import type {
  GeographyPageDto,
  MicroregionCreateDto,
  MicroregionDto,
  MicroregionListQuery,
  MicroregionUpdateDto,
} from '../../../domain/geography.js';
import { jsonBody, requestReferenceData } from './referenceDataHttp.js';

export const microregionsService = {
  list(baseUrl: string, query: MicroregionListQuery, signal?: AbortSignal) {
    const params = new URLSearchParams({
      macroregion_id: query.macroregionId,
      page: String(query.page),
      page_size: String(query.pageSize),
    });
    return requestReferenceData<GeographyPageDto<MicroregionDto>>(
      baseUrl,
      `microregions?${params.toString()}`,
      { signal },
    );
  },
  get(baseUrl: string, id: string, signal?: AbortSignal) {
    return requestReferenceData<MicroregionDto>(baseUrl, `microregions/${encodeURIComponent(id)}`, { signal });
  },
  create(baseUrl: string, body: MicroregionCreateDto) {
    return requestReferenceData<MicroregionDto>(baseUrl, 'microregions', { method: 'POST', body: jsonBody(body) });
  },
  update(baseUrl: string, id: string, body: MicroregionUpdateDto) {
    return requestReferenceData<MicroregionDto>(baseUrl, `microregions/${encodeURIComponent(id)}`, { method: 'PUT', body: jsonBody(body) });
  },
  deactivate(baseUrl: string, id: string) {
    return requestReferenceData<void>(baseUrl, `microregions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
