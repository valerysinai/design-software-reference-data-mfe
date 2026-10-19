import type { components } from '../contracts/reference-data.generated.js';

export type PaginationDto = components['schemas']['Pagination'];

export interface PageDto<T> {
  data: T[];
  pagination: PaginationDto;
}

export type CatalogDto = components['schemas']['Catalog'];

export type CatalogCreateDto = components['schemas']['CatalogCreate'];

export type CatalogUpdateDto = components['schemas']['CatalogUpdate'];

export type CatalogDetailDto = components['schemas']['CatalogDetail'];

export type CatalogDetailCreateDto = components['schemas']['CatalogDetailCreate'];

export type CatalogDetailUpdateDto = components['schemas']['CatalogDetailUpdate'];

export const VALUE_TYPES = ['integer', 'string', 'boolean', 'json'] as const;
export type ParameterValueType = components['schemas']['Parameter']['value_type'];

export type ParameterDto = components['schemas']['Parameter'];

export type ParameterCreateDto = components['schemas']['ParameterCreate'];

export type ParameterUpdateDto = components['schemas']['ParameterUpdate'];

