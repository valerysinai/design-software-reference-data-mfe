import type { PageDto, ParameterCreateDto, ParameterDto, ParameterUpdateDto, ParameterValueType } from '../../../domain/catalog.js';
import { jsonBody, requestReferenceData } from './referenceDataHttp.js';

export interface ParameterListQuery { page: number; pageSize: number; key?: string; valueType?: ParameterValueType; }

export const parametersService = {
  list(baseUrl: string, input: ParameterListQuery, signal?: AbortSignal) {
    const params = new URLSearchParams({ page: String(input.page), page_size: String(input.pageSize) });
    if (input.key) params.set('key', input.key);
    if (input.valueType) params.set('value_type', input.valueType);
    return requestReferenceData<PageDto<ParameterDto>>(baseUrl, `parameters?${params.toString()}`, { signal });
  },
  get(baseUrl: string, id: string, signal?: AbortSignal) {
    return requestReferenceData<ParameterDto>(baseUrl, `parameters/${encodeURIComponent(id)}`, { signal });
  },
  create(baseUrl: string, body: ParameterCreateDto) {
    return requestReferenceData<ParameterDto>(baseUrl, 'parameters', { method: 'POST', body: jsonBody(body) });
  },
  update(baseUrl: string, id: string, body: ParameterUpdateDto) {
    return requestReferenceData<ParameterDto>(baseUrl, `parameters/${encodeURIComponent(id)}`, { method: 'PUT', body: jsonBody(body) });
  },
};

