import { useCallback, useMemo, useState } from 'react';
import type {
  CatalogCreateDto,
  CatalogDetailCreateDto,
  CatalogDetailDto,
  CatalogDetailUpdateDto,
  CatalogDto,
  CatalogUpdateDto,
  PageDto,
  ParameterCreateDto,
  ParameterDto,
  ParameterUpdateDto,
} from '../domain/catalog.js';

const demoCatalogs: CatalogDto[] = [
  { id: 'demo:catalog:modality', code: 'TRAINING_MODALITY', name: 'Modalidad de formación', description: 'Modalidades disponibles', is_active: true, created_at: '' },
  { id: 'demo:catalog:shift', code: 'TRAINING_SHIFT', name: 'Jornada de formación', description: 'Jornadas disponibles', is_active: true, created_at: '' },
  { id: 'demo:catalog:environment', code: 'ENVIRONMENT_TYPE', name: 'Tipo de ambiente', description: 'Tipos de ambiente', is_active: true, created_at: '' },
];

const demoDetails: CatalogDetailDto[] = [
  { id: 'demo:detail:1', catalog_id: 'demo:catalog:modality', code: 'PRESENTIAL', label: 'Presencial', display_order: 1, is_active: true, created_at: '' },
  { id: 'demo:detail:2', catalog_id: 'demo:catalog:modality', code: 'VIRTUAL', label: 'Virtual', display_order: 2, is_active: true, created_at: '' },
  { id: 'demo:detail:3', catalog_id: 'demo:catalog:modality', code: 'HYBRID', label: 'Híbrida', display_order: 3, is_active: true, created_at: '' },
  { id: 'demo:detail:4', catalog_id: 'demo:catalog:shift', code: 'DAY', label: 'Diurna', display_order: 1, is_active: true, created_at: '' },
];

const demoParameters: ParameterDto[] = [
  { id: 'demo:parameter:1', key: 'MAX_HOURS_PER_WEEK', value: '48', value_type: 'integer', description: 'Máximo de horas semanales por instructor.', created_at: '' },
  { id: 'demo:parameter:2', key: 'SCHEDULE_LOCK_MINUTES', value: '15', value_type: 'integer', description: 'Tiempo de bloqueo optimista para edición.', created_at: '' },
  { id: 'demo:parameter:3', key: 'NOTIFICATION_RETRY_COUNT', value: '3', value_type: 'integer', description: 'Cantidad máxima de reintentos de envío.', created_at: '' },
];

const page = <T,>(items: T[], current: number, pageSize: number): PageDto<T> => ({
  data: items.slice((current - 1) * pageSize, current * pageSize),
  pagination: { page: current, page_size: pageSize, total_items: items.length, total_pages: Math.ceil(items.length / pageSize) },
});

const includes = (value: string, search: string) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());

export function useParameterizationDemo(enabled: boolean, catalogSearch: string, catalogId: string | undefined, detailSearch: string, parameterSearch: string) {
  const [catalogItems, setCatalogItems] = useState(demoCatalogs);
  const [detailItems, setDetailItems] = useState(demoDetails);
  const [parameterItems, setParameterItems] = useState(demoParameters);
  const [catalogPage, setCatalogPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const [parameterPage, setParameterPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(10);
  const [detailPageSize, setDetailPageSize] = useState(10);
  const [parameterPageSize, setParameterPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const filteredCatalogs = useMemo(() => catalogItems.filter((item) => !catalogSearch.trim() || includes(item.code, catalogSearch) || includes(item.name, catalogSearch)), [catalogItems, catalogSearch, revision]);
  const filteredDetails = useMemo(() => detailItems.filter((item) => item.catalog_id === catalogId && (!detailSearch.trim() || includes(item.code, detailSearch))), [catalogId, detailItems, detailSearch, revision]);
  const filteredParameters = useMemo(() => parameterItems.filter((item) => !parameterSearch.trim() || includes(item.key, parameterSearch)), [parameterItems, parameterSearch, revision]);
  const createCatalog = useCallback(async (body: CatalogCreateDto) => { const item: CatalogDto = { ...body, id: `demo:catalog:${Date.now()}`, created_at: '' }; setCatalogItems((items) => [...items, item]); }, []);
  const updateCatalog = useCallback(async (id: string, body: CatalogUpdateDto) => { setCatalogItems((items) => items.map((item) => item.id === id ? { ...item, ...body } : item)); }, []);
  const createDetail = useCallback(async (body: CatalogDetailCreateDto) => { if (!catalogId) return; setDetailItems((items) => [...items, { ...body, id: `demo:detail:${Date.now()}`, catalog_id: catalogId, created_at: '' }]); }, [catalogId]);
  const updateDetail = useCallback(async (id: string, body: CatalogDetailUpdateDto) => { setDetailItems((items) => items.map((item) => item.id === id ? { ...item, ...body } : item)); }, []);
  const createParameter = useCallback(async (body: ParameterCreateDto) => { setParameterItems((items) => [...items, { ...body, id: `demo:parameter:${Date.now()}`, created_at: '' }]); }, []);
  const updateParameter = useCallback(async (id: string, body: ParameterUpdateDto) => { setParameterItems((items) => items.map((item) => item.id === id ? { ...item, ...body } : item)); }, []);
  const disabled = !enabled;
  return {
    catalogs: { items: enabled ? page(filteredCatalogs, catalogPage, catalogPageSize).data : [], pagination: enabled ? page(filteredCatalogs, catalogPage, catalogPageSize).pagination : undefined, loading: false, error: undefined, page: catalogPage, pageSize: catalogPageSize, setPage: setCatalogPage, setPageSize: (size: number) => { setCatalogPageSize(size); setCatalogPage(1); }, refresh, create: createCatalog, update: updateCatalog },
    details: { items: enabled ? page(filteredDetails, detailPage, detailPageSize).data : [], pagination: enabled ? page(filteredDetails, detailPage, detailPageSize).pagination : undefined, loading: false, error: undefined, page: detailPage, pageSize: detailPageSize, setPage: setDetailPage, setPageSize: (size: number) => { setDetailPageSize(size); setDetailPage(1); }, refresh, create: createDetail, update: updateDetail },
    parameters: { items: enabled ? page(filteredParameters, parameterPage, parameterPageSize).data : [], pagination: enabled ? page(filteredParameters, parameterPage, parameterPageSize).pagination : undefined, loading: false, error: undefined, page: parameterPage, pageSize: parameterPageSize, setPage: setParameterPage, setPageSize: (size: number) => { setParameterPageSize(size); setParameterPage(1); }, refresh, create: createParameter, update: updateParameter },
    disabled,
  };
}
