import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { institutionalUnitsService } from '../../src/adapter/out/http/institutionalUnitsService.js';
import { trainingCentersService } from '../../src/adapter/out/http/trainingCentersService.js';

const baseUrl = 'https://reference-data.example/api/v1';

describe('servicios HTTP de centros y unidades institucionales', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lista centros y sedes con filtros de estado y relaciones', async () => {
    await trainingCentersService.list(baseUrl, { page: 2, pageSize: 20, isActive: false });
    await institutionalUnitsService.list(baseUrl, {
      page: 1,
      pageSize: 50,
      isActive: true,
      trainingCenterId: 'center /1',
    });

    const centerUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const unitUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(centerUrl.pathname).toBe('/api/v1/training-centers');
    expect(centerUrl.searchParams.get('is_active')).toBe('false');
    expect(centerUrl.searchParams.get('page')).toBe('2');
    expect(unitUrl.pathname).toBe('/api/v1/institutional-units');
    expect(unitUrl.searchParams.get('is_active')).toBe('true');
    expect(unitUrl.searchParams.get('training_center_id')).toBe('center /1');
  });

  it('crea ambos recursos y actualiza un centro sin enviar su código inmutable', async () => {
    await trainingCentersService.create(baseUrl, {
      center_code: 'C-001',
      name: 'Centro de prueba',
      municipality_id: 'municipality-1',
      phone: '555-0100',
    });
    await trainingCentersService.update(baseUrl, 'center/1', {
      name: 'Centro actualizado',
      municipality_id: 'municipality-1',
    });
    await institutionalUnitsService.create(baseUrl, {
      training_center_id: 'center-1',
      name: 'Sede norte',
      unit_type: 'MIXED',
    });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        center_code: 'C-001',
        name: 'Centro de prueba',
        municipality_id: 'municipality-1',
        phone: '555-0100',
      }),
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({
        name: 'Centro actualizado',
        municipality_id: 'municipality-1',
      }),
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).not.toHaveProperty('center_code');
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        training_center_id: 'center-1',
        name: 'Sede norte',
        unit_type: 'MIXED',
      }),
    });
  });

  it('desactiva con DELETE en los dos recursos', async () => {
    await trainingCentersService.deactivate(baseUrl, 'center-1');
    await institutionalUnitsService.deactivate(baseUrl, 'unit-1');

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'DELETE' });
  });

  it('municipality selector can reuse the geography hook to list without a department filter', async () => {
    const { municipalitiesService } = await import('../../src/adapter/out/http/municipalitiesService.js');
    await municipalitiesService.list(baseUrl, { page: 1, pageSize: 50 });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/api/v1/municipalities');
    expect(url.searchParams.has('department_id')).toBe(false);
  });
});
