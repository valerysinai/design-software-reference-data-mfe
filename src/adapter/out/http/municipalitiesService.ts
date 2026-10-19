import type {
  GeographyPageDto,
  MunicipalityCreateDto,
  MunicipalityDto,
  MunicipalityListQuery,
  MunicipalityUpdateDto,
} from '../../../domain/geography.js';
import { jsonBody, requestReferenceData } from './referenceDataHttp.js';

export const municipalitiesService = {
  list(baseUrl: string, query: MunicipalityListQuery, signal?: AbortSignal) {
    const params = new URLSearchParams({
      page: String(query.page),
      page_size: String(query.pageSize),
    });
    if (query.departmentId) params.set('department_id', query.departmentId);
    return requestReferenceData<GeographyPageDto<MunicipalityDto>>(
      baseUrl,
      `municipalities?${params.toString()}`,
      { signal },
    );
  },
  get(baseUrl: string, id: string, signal?: AbortSignal) {
    return requestReferenceData<MunicipalityDto>(baseUrl, `municipalities/${encodeURIComponent(id)}`, { signal });
  },
  create(baseUrl: string, body: MunicipalityCreateDto) {
    return requestReferenceData<MunicipalityDto>(baseUrl, 'municipalities', { method: 'POST', body: jsonBody(body) });
  },
  update(baseUrl: string, id: string, body: MunicipalityUpdateDto) {
    return requestReferenceData<MunicipalityDto>(baseUrl, `municipalities/${encodeURIComponent(id)}`, { method: 'PUT', body: jsonBody(body) });
  },
  deactivate(baseUrl: string, id: string) {
    return requestReferenceData<void>(baseUrl, `municipalities/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
