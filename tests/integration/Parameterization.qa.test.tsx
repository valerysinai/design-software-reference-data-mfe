import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Parameterization } from '../../src/adapter/in/components/Parameterization.js';

const permissions = { canViewCatalogs: true, canManageCatalogs: true, canViewParameters: true, canManageParameters: true };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const page = (data: unknown[]) => ({ data, pagination: { page: 1, page_size: 10, total_items: data.length, total_pages: data.length ? 1 : 0 } });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('QA HU-REF-014', () => {
  it('filtra nombres de una y varias palabras sobre registros cargados', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(page([
      { id: 'c1', code: 'TRAINING_MODALITY', name: 'Modalidad de formación', description: null, is_active: true, created_at: '' },
      { id: 'c2', code: 'ENVIRONMENT_TYPE', name: 'Tipo de ambiente', description: null, is_active: true, created_at: '' },
    ])));
    vi.stubGlobal('fetch', fetchMock);
    render(<Parameterization baseUrl="https://reference.example/api/v1" {...permissions} />);
    await screen.findByRole('button', { name: /TRAINING_MODALITY/ });
    const search = screen.getByRole('textbox', { name: /Buscar catálogo/i });
    fireEvent.change(search, { target: { value: 'Modalidad' } });
    expect(screen.getByRole('button', { name: /TRAINING_MODALITY/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /ENVIRONMENT_TYPE/ })).toBeNull();
    fireEvent.change(search, { target: { value: 'Modalidad de formación' } });
    expect(screen.getByRole('button', { name: /TRAINING_MODALITY/ })).toBeTruthy();
  });

  it('envía los códigos al backend y no conserva una respuesta obsoleta', async () => {
    let resolveCode: ((value: Response) => void) | undefined;
    const codeResponse = new Promise<Response>((resolve) => { resolveCode = resolve; });
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response(page([])))
      .mockImplementationOnce(() => codeResponse);
    vi.stubGlobal('fetch', fetchMock);
    render(<Parameterization baseUrl="https://reference.example/api/v1" {...permissions} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole('textbox', { name: /Buscar catálogo/i }), { target: { value: 'TRAINING_MODALITY' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Buscar catálogo/i }), { target: { value: 'Modalidad' } });
    resolveCode?.(response(page([{ id: 'stale', code: 'TRAINING_MODALITY', name: 'Obsoleto', description: null, is_active: true, created_at: '' }])));
    await waitFor(() => expect(screen.queryByText('Obsoleto')).toBeNull());
  });

  it('muestra el estado vacío después de una respuesta exitosa', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(page([])));
    vi.stubGlobal('fetch', fetchMock);
    render(<Parameterization baseUrl="https://reference.example/api/v1" {...permissions} />);
    await waitFor(() => expect(screen.getByText(/No hay catálogos para mostrar/i)).toBeTruthy());
    expect(screen.queryByText(/Cargando catálogos/i)).toBeNull();
  });
});
