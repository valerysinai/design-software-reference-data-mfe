import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { departmentsService } from '../../src/adapter/out/http/departmentsService.js';
import { macroregionsService } from '../../src/adapter/out/http/macroregionsService.js';
import { microregionsService } from '../../src/adapter/out/http/microregionsService.js';
import { municipalitiesService } from '../../src/adapter/out/http/municipalitiesService.js';

const baseUrl = 'https://reference-data.example/api/v1';
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

describe('servicios HTTP de jerarquía (unitarios con fetch simulado)', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => response({ id: 'id-1', name: 'Registro', code: 'COD', is_active: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('usa las cuatro rutas de listado y los filtros obligatorios de cada padre', async () => {
    fetchMock.mockImplementation(async () => response({ data: [], pagination: { page: 2, page_size: 50, total_items: 51, total_pages: 2 } }));
    await macroregionsService.list(baseUrl, { page: 2, pageSize: 50 });
    await microregionsService.list(baseUrl, { macroregionId: 'macro /1', page: 1, pageSize: 10 });
    await departmentsService.list(baseUrl, { microregionId: 'micro-1', page: 1, pageSize: 20 });
    await municipalitiesService.list(baseUrl, { departmentId: 'department-1', page: 3, pageSize: 50 });

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(urls.map((url) => url.pathname)).toEqual([
      '/api/v1/macroregions',
      '/api/v1/microregions',
      '/api/v1/departments',
      '/api/v1/municipalities',
    ]);
    expect(urls[0]?.searchParams.get('page_size')).toBe('50');
    expect(urls[1]?.searchParams.get('macroregion_id')).toBe('macro /1');
    expect(urls[1]?.searchParams.get('page_size')).toBe('10');
    expect(urls[2]?.searchParams.get('microregion_id')).toBe('micro-1');
    expect(urls[3]?.searchParams.get('department_id')).toBe('department-1');
    expect(urls[3]?.searchParams.get('page')).toBe('3');
  });

  it('usa GET por id y POST, PUT y DELETE en cada recurso con las relaciones del contrato local', async () => {
    const services = [
      {
        path: 'macroregions',
        createBody: { name: 'Macro', code: 'MAC' },
        updateBody: { name: 'Macro editada' },
        get: () => macroregionsService.get(baseUrl, 'id/1'),
        create: () => macroregionsService.create(baseUrl, { name: 'Macro', code: 'MAC' }),
        update: () => macroregionsService.update(baseUrl, 'id/1', { name: 'Macro editada' }),
        deactivate: () => macroregionsService.deactivate(baseUrl, 'id/1'),
      },
      {
        path: 'microregions',
        createBody: { name: 'Micro', code: 'MIC', macroregion_id: 'macro-1' },
        updateBody: { macroregion_id: 'macro-2' },
        get: () => microregionsService.get(baseUrl, 'id/1'),
        create: () => microregionsService.create(baseUrl, { name: 'Micro', code: 'MIC', macroregion_id: 'macro-1' }),
        update: () => microregionsService.update(baseUrl, 'id/1', { macroregion_id: 'macro-2' }),
        deactivate: () => microregionsService.deactivate(baseUrl, 'id/1'),
      },
      {
        path: 'departments',
        createBody: { name: 'Depto', dane_code: '12345', microregion_id: 'micro-1' },
        updateBody: { microregion_id: 'micro-2' },
        get: () => departmentsService.get(baseUrl, 'id/1'),
        create: () => departmentsService.create(baseUrl, { name: 'Depto', dane_code: '12345', microregion_id: 'micro-1' }),
        update: () => departmentsService.update(baseUrl, 'id/1', { microregion_id: 'micro-2' }),
        deactivate: () => departmentsService.deactivate(baseUrl, 'id/1'),
      },
      {
        path: 'municipalities',
        createBody: { name: 'Mpio', dane_code: '12345678', department_id: 'department-1' },
        updateBody: { department_id: 'department-2' },
        get: () => municipalitiesService.get(baseUrl, 'id/1'),
        create: () => municipalitiesService.create(baseUrl, { name: 'Mpio', dane_code: '12345678', department_id: 'department-1' }),
        update: () => municipalitiesService.update(baseUrl, 'id/1', { department_id: 'department-2' }),
        deactivate: () => municipalitiesService.deactivate(baseUrl, 'id/1'),
      },
    ];

    for (const service of services) {
      await service.get();
      await service.create();
      await service.update();
      await service.deactivate();
    }

    expect(fetchMock).toHaveBeenCalledTimes(16);
    services.forEach((service, index) => {
      const offset = index * 4;
      const firstUrl = new URL(String(fetchMock.mock.calls[offset]?.[0]));
      expect(firstUrl.pathname).toBe(`/api/v1/${service.path}/id%2F1`);
      expect(fetchMock.mock.calls[offset + 1]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify(service.createBody) });
      expect(fetchMock.mock.calls[offset + 2]?.[1]).toMatchObject({ method: 'PUT', body: JSON.stringify(service.updateBody) });
      expect(fetchMock.mock.calls[offset + 3]?.[1]).toMatchObject({ method: 'DELETE' });
    });
  });

  it('propaga el status y el código del error HTTP sin reclasificar conflictos', async () => {
    fetchMock.mockResolvedValue(response({ error: { code: 'CONFLICT', message: 'Conflicto genérico.' } }, 409));
    await expect(municipalitiesService.deactivate(baseUrl, 'municipality-1')).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: 'Conflicto genérico.',
    });
  });

  it('propaga 401 como error de autenticación sin adjuntar ni exponer credenciales', async () => {
    fetchMock.mockResolvedValue(response({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida.' } }, 401));
    await expect(macroregionsService.list(baseUrl, { page: 1, pageSize: 10 })).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Autenticación requerida.',
    });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty('Authorization');
  });
});
