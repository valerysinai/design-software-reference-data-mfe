import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.js';

const permissions = ['REF_CATALOG_VIEW', 'REF_CATALOG_MANAGE', 'REF_PARAMETER_VIEW', 'REF_PARAMETER_MANAGE'];

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('parametrización visual y demo local', () => {
  it('muestra el encabezado dinámico y conserva la tabla de detalles sin selección', () => {
    vi.stubEnv('VITE_REFERENCE_DATA_API_BASE_URL', '');
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    render(<App permissions={permissions} />);
    fireEvent.click(screen.getByRole('button', { name: /Catálogos y parámetros/i }));
    expect(screen.getByRole('heading', { name: 'Parametrización / catálogos' })).toBeTruthy();
    expect(screen.getByText('Administración de catálogos, valores y parámetros del sistema.')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'CÓDIGO' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'ACCIÓN' })).toBeTruthy();
    const addButton = screen.getByRole('button', { name: 'Agregar valor' });
    expect((addButton as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('muestra datos demo y no los envía al backend', () => {
    vi.stubEnv('VITE_REFERENCE_DATA_API_BASE_URL', '');
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    render(<App permissions={permissions} />);
    fireEvent.click(screen.getByRole('button', { name: /Catálogos y parámetros/i }));
    fireEvent.click(screen.getByRole('button', { name: /TRAINING_MODALITY/ }));
    expect(screen.getByText('Presencial')).toBeTruthy();
    expect(screen.getByText('Virtual')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mantiene el flujo HTTP cuando existe URL de API', () => {
    vi.stubEnv('VITE_REFERENCE_DATA_API_BASE_URL', 'https://reference.example/api/v1');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: [], pagination: { page: 1, page_size: 10, total_items: 0, total_pages: 0 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App permissions={permissions} />);
    fireEvent.click(screen.getByRole('button', { name: /Catálogos y parámetros/i }));
    expect(fetchMock).toHaveBeenCalled();
  });
});
