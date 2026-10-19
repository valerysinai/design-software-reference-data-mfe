import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogsService } from '../../src/adapter/out/http/catalogsService.js';
import { parametersService } from '../../src/adapter/out/http/parametersService.js';

const baseUrl = 'https://reference.example/api/v1';
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('servicios HTTP de parametrización', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { fetchMock.mockImplementation(async () => response({ data: [], pagination: { page: 1, page_size: 10, total_items: 0, total_pages: 0 } })); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it('usa las rutas anidadas de catálogos y detalles con paginación', async () => {
    await catalogsService.list(baseUrl, { page: 2, pageSize: 10, code: 'TRAINING_MODALITY' });
    await catalogsService.get(baseUrl, 'catalog/1');
    await catalogsService.listDetails(baseUrl, 'catalog/1', { page: 1, pageSize: 20 });
    await catalogsService.createDetail(baseUrl, 'catalog/1', { code: 'IN_PERSON', label: 'Presencial', display_order: 1 });
    await catalogsService.getDetail(baseUrl, 'catalog/1', 'detail/1');
    await catalogsService.updateDetail(baseUrl, 'catalog/1', 'detail/1', { label: 'Presencial' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await catalogsService.deactivateDetail(baseUrl, 'catalog/1', 'detail/1');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await catalogsService.deactivate(baseUrl, 'catalog/1');
    const calls = fetchMock.mock.calls;
    expect(new URL(String(calls[0]?.[0])).pathname).toBe('/api/v1/catalogs');
    expect(new URL(String(calls[0]?.[0])).searchParams.get('code')).toBe('TRAINING_MODALITY');
    expect(new URL(String(calls[1]?.[0])).pathname).toBe('/api/v1/catalogs/catalog%2F1');
    expect(new URL(String(calls[2]?.[0])).pathname).toBe('/api/v1/catalogs/catalog%2F1/details');
    expect(calls[3]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ code: 'IN_PERSON', label: 'Presencial', display_order: 1 }) });
    expect(new URL(String(calls[4]?.[0])).pathname).toBe('/api/v1/catalogs/catalog%2F1/details/detail%2F1');
    expect(calls[5]?.[1]).toMatchObject({ method: 'PUT' });
    expect(calls[6]?.[1]).toMatchObject({ method: 'DELETE' });
    expect(calls[7]?.[1]).toMatchObject({ method: 'DELETE' });
  });

  it('envía tipos y propaga conflictos de parámetros', async () => {
    await parametersService.get(baseUrl, 'parameter/1');
    await parametersService.create(baseUrl, { key: 'MAX_HOURS_PER_WEEK', value: '48', value_type: 'integer', description: null });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
    fetchMock.mockResolvedValueOnce(response({ error: { code: 'CONFLICT', message: 'La clave ya existe.' } }, 409));
    await expect(parametersService.create(baseUrl, { key: 'MAX_HOURS_PER_WEEK', value: '48', value_type: 'integer' })).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
  });
});

