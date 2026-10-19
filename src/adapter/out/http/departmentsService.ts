import type {
  DepartmentCreateDto,
  DepartmentDto,
  DepartmentListQuery,
  DepartmentUpdateDto,
  GeographyPageDto,
} from '../../../domain/geography.js';
import { jsonBody, requestReferenceData } from './referenceDataHttp.js';

export const departmentsService = {
  list(baseUrl: string, query: DepartmentListQuery, signal?: AbortSignal) {
    const params = new URLSearchParams({
      microregion_id: query.microregionId,
      page: String(query.page),
      page_size: String(query.pageSize),
    });
    return requestReferenceData<GeographyPageDto<DepartmentDto>>(
      baseUrl,
      `departments?${params.toString()}`,
      { signal },
    );
  },
  get(baseUrl: string, id: string, signal?: AbortSignal) {
    return requestReferenceData<DepartmentDto>(baseUrl, `departments/${encodeURIComponent(id)}`, { signal });
  },
  create(baseUrl: string, body: DepartmentCreateDto) {
    return requestReferenceData<DepartmentDto>(baseUrl, 'departments', { method: 'POST', body: jsonBody(body) });
  },
  update(baseUrl: string, id: string, body: DepartmentUpdateDto) {
    return requestReferenceData<DepartmentDto>(baseUrl, `departments/${encodeURIComponent(id)}`, { method: 'PUT', body: jsonBody(body) });
  },
  deactivate(baseUrl: string, id: string) {
    return requestReferenceData<void>(baseUrl, `departments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
