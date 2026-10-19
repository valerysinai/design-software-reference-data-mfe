import type {
  TrainingCenterCreateDto,
  TrainingCenterDto,
  TrainingCenterPageDto,
  TrainingCenterUpdateDto,
  InstitutionalStructureListQuery,
} from '../../../domain/institutionalStructure.js';
import { jsonBody, requestReferenceData } from './referenceDataHttp.js';

const listQuery = (query: InstitutionalStructureListQuery) => {
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
  });
  if (query.isActive !== undefined) params.set('is_active', String(query.isActive));
  return params;
};

export const trainingCentersService = {
  list(baseUrl: string, query: InstitutionalStructureListQuery, signal?: AbortSignal) {
    return requestReferenceData<TrainingCenterPageDto>(
      baseUrl,
      `training-centers?${listQuery(query).toString()}`,
      { signal },
    );
  },
  create(baseUrl: string, body: TrainingCenterCreateDto) {
    return requestReferenceData<TrainingCenterDto>(baseUrl, 'training-centers', {
      method: 'POST',
      body: jsonBody(body),
    });
  },
  update(baseUrl: string, id: string, body: TrainingCenterUpdateDto) {
    return requestReferenceData<TrainingCenterDto>(
      baseUrl,
      `training-centers/${encodeURIComponent(id)}`,
      { method: 'PUT', body: jsonBody(body) },
    );
  },
  deactivate(baseUrl: string, id: string) {
    return requestReferenceData<void>(
      baseUrl,
      `training-centers/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  },
};
