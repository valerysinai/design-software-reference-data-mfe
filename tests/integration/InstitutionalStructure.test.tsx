import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../src/App.js';
import { InstitutionalStructure } from '../../src/adapter/in/components/InstitutionalStructure.js';

const baseUrl = 'https://reference.example/api/v1';
const page = (data: unknown[]) => new Response(JSON.stringify({
  data,
  pagination: { page: 1, page_size: 50, total_items: data.length, total_pages: data.length ? 1 : 0 },
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

const center = {
  id: 'center-1',
  center_code: 'C-001',
  name: 'Centro Norte',
  municipality_id: 'municipality-1',
  phone: '555-0100',
  address: 'Calle 10',
  is_active: true,
};

const municipality = {
  id: 'municipality-1',
  department_id: 'department-1',
  name: 'Bogotá',
  dane_code: '11001000',
  is_active: true,
};

const unit = {
  id: 'unit-1',
  training_center_id: 'center-1',
  name: 'Sede Centro',
  unit_type: 'ACADEMIC',
  is_active: true,
};

describe('gestión de centros de formación y sedes', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/training-centers') && init?.method === 'POST') {
        return new Response(JSON.stringify({
          error: { code: 'CONFLICT', message: 'Código duplicado.' },
        }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.pathname.endsWith('/training-centers')) return page([center]);
      if (url.pathname.endsWith('/municipalities')) return page([municipality]);
      if (url.pathname.endsWith('/institutional-units') && init?.method === 'POST') {
        return new Response(JSON.stringify(unit), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.pathname.endsWith('/institutional-units')) return page([unit]);
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deshabilita el código del centro al editar y lo omite del PUT', async () => {
    render(<InstitutionalStructure baseUrl={baseUrl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    const form = screen.getByRole('form', { name: 'Editar centro de formación' });
    const code = within(form).getByLabelText(/Código del centro/) as HTMLInputElement;
    expect(code.disabled).toBe(true);
    expect(code.value).toBe('C-001');
    fireEvent.submit(form);

    await waitFor(() => {
      const update = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
      expect(update).toBeDefined();
    });
    const update = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(update?.[1]?.body))).not.toHaveProperty('center_code');
  });

  it('muestra el conflicto de código duplicado inline y no registra el teléfono', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    render(<InstitutionalStructure baseUrl={baseUrl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Crear centro' }));
    const form = screen.getByRole('form', { name: 'Crear centro de formación' });
    fireEvent.change(within(form).getByLabelText(/Código del centro/), { target: { value: 'C-001' } });
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Centro duplicado' } });
    fireEvent.change(within(form).getByLabelText('Municipio'), { target: { value: 'municipality-1' } });
    fireEvent.change(within(form).getByLabelText('Teléfono'), { target: { value: '555-0100' } });
    fireEvent.submit(form);

    expect(await screen.findByText('Ya existe un centro con este código.')).toBeTruthy();
    expect(within(form).getByLabelText(/Código del centro/).getAttribute('aria-invalid')).toBe('true');
    expect(consoleLog).not.toHaveBeenCalledWith(expect.stringContaining('555-0100'));
  });

  it('usa un selector restringido a los tres tipos permitidos para crear sedes', async () => {
    render(<InstitutionalStructure baseUrl={baseUrl} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Unidades institucionales' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Crear sede' }));

    const form = screen.getByRole('form', { name: 'Crear unidad institucional' });
    fireEvent.change(within(form).getByLabelText('Centro de formación'), { target: { value: 'center-1' } });
    fireEvent.change(within(form).getByLabelText('Nombre de la sede'), { target: { value: 'Sede nueva' } });
    const unitType = within(form).getByLabelText('Tipo de unidad') as HTMLSelectElement;
    expect(Array.from(unitType.options).map((option) => option.value)).toEqual(['', 'ACADEMIC', 'ADMINISTRATIVE', 'MIXED']);
    fireEvent.change(unitType, { target: { value: 'MIXED' } });
    fireEvent.submit(form);

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST' && String(init.body).includes('"unit_type":"MIXED"'))).toBe(true));
  });

  it('no presenta la navegación de centros y sedes sin el permiso REF_HIERARCHY_MANAGE', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Centros y sedes' })).toBeNull();
  });

  it('monta la sección institucional cuando el host concede REF_HIERARCHY_MANAGE', () => {
    render(<App permissions={['REF_HIERARCHY_MANAGE']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Centros y sedes' }));
    expect(screen.getByRole('heading', { name: 'Centros de formación' })).toBeTruthy();
  });
});
