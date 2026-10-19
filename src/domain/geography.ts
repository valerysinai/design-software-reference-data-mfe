/**
 * API DTO projections based on the locally available Reference Data OpenAPI 1.0.0
 * copy. That copy is still under contract review; replace these declarations with
 * generated types after the canonical shared-contracts source is approved.
 */
export interface GeographyPaginationDto {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface GeographyPageDto<T> {
  data: T[];
  pagination: GeographyPaginationDto;
}

export interface MacroregionDto {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface MicroregionDto {
  id: string;
  macroregion_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface DepartmentDto {
  id: string;
  microregion_id: string;
  name: string;
  dane_code: string;
  is_active: boolean;
}

export interface MunicipalityDto {
  id: string;
  department_id: string;
  name: string;
  dane_code: string;
  is_active: boolean;
}

export interface MacroregionCreateDto {
  name: string;
  code: string;
}

export interface MicroregionCreateDto extends MacroregionCreateDto {
  macroregion_id: string;
}

export interface DepartmentCreateDto {
  name: string;
  dane_code: string;
  microregion_id: string;
}

export interface MunicipalityCreateDto {
  name: string;
  dane_code: string;
  department_id: string;
}

export type MacroregionUpdateDto = Partial<MacroregionCreateDto>;
export type MicroregionUpdateDto = Partial<MicroregionCreateDto>;
export type DepartmentUpdateDto = Partial<DepartmentCreateDto>;
export type MunicipalityUpdateDto = Partial<MunicipalityCreateDto>;

export interface GeographyListQuery {
  page: number;
  pageSize: number;
}

export type MacroregionListQuery = GeographyListQuery;
export interface MicroregionListQuery extends GeographyListQuery {
  macroregionId: string;
}
export interface DepartmentListQuery extends GeographyListQuery {
  microregionId: string;
}
export interface MunicipalityListQuery extends GeographyListQuery {
  departmentId?: string;
}
