import type { GeographyPaginationDto, GeographyPageDto } from './geography.js';

export interface TrainingCenterDto {
  id: string;
  center_code: string;
  name: string;
  municipality_id: string;
  phone?: string | null;
  address?: string | null;
  is_active: boolean;
}

export interface TrainingCenterCreateDto {
  center_code: string;
  name: string;
  municipality_id: string;
  phone?: string;
  address?: string;
}

export type TrainingCenterUpdateDto = Partial<Omit<TrainingCenterCreateDto, 'center_code'>>;

export type InstitutionalUnitType = 'ACADEMIC' | 'ADMINISTRATIVE' | 'MIXED';

export interface InstitutionalUnitDto {
  id: string;
  training_center_id: string;
  name: string;
  unit_type: InstitutionalUnitType;
  is_active: boolean;
}

export interface InstitutionalUnitCreateDto {
  training_center_id: string;
  name: string;
  unit_type: InstitutionalUnitType;
}

export type InstitutionalUnitUpdateDto = Partial<InstitutionalUnitCreateDto>;

export interface InstitutionalStructureListQuery {
  page: number;
  pageSize: number;
  isActive?: boolean;
}

export interface InstitutionalUnitListQuery extends InstitutionalStructureListQuery {
  trainingCenterId?: string;
}

export type TrainingCenterPageDto = GeographyPageDto<TrainingCenterDto>;
export type InstitutionalUnitPageDto = GeographyPageDto<InstitutionalUnitDto>;
export type InstitutionalStructurePaginationDto = GeographyPaginationDto;
