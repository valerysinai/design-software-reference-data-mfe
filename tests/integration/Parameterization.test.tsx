import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Parameterization } from '../../src/adapter/in/components/Parameterization.js';

const permissions = { canViewCatalogs: true, canManageCatalogs: true, canViewParameters: true, canManageParameters: true };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Parametrización', () => {
  it('no muestra la sección cuando no hay permisos de lectura', () => {
    render(<Parameterization baseUrl="https://reference.example/api/v1" canViewCatalogs={false} canManageCatalogs={false} canViewParameters={false} canManageParameters={false} />);
    expect(screen.getByText('No tienes permisos para consultar esta sección.')).toBeTruthy();
  });

  it('lista catálogos, selecciona uno y consulta sus detalles', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ data: [{ id: 'c1', code: 'TRAINING_MODALITY', name: 'Modalidad de formación', description: null, is_active: true, created_at: '' }], pagination: { page: 1, page_size: 10, total_items: 1, total_pages: 1 } }))
      .mockResolvedValueOnce(response({ data: [{ id: 'd1', catalog_id: 'c1', code: 'PRESENTIAL', label: 'Presencial', display_order: 1, is_active: true, created_at: '' }], pagination: { page: 1, page_size: 10, total_items: 1, total_pages: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Parameterization baseUrl="https://reference.example/api/v1" {...permissions} />);
    const catalog = await screen.findByRole('button', { name: /TRAINING_MODALITY/ });
    fireEvent.click(catalog);
    expect(await screen.findByText('Presencial')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('mantiene abierto el modal y muestra conflicto de código duplicado', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ data: [{ id: 'c1', code: 'MODALITY', name: 'Modalidad', description: null, is_active: true, created_at: '' }], pagination: { page: 1, page_size: 10, total_items: 1, total_pages: 1 } }))
      .mockResolvedValueOnce(response({ data: [], pagination: { page: 1, page_size: 10, total_items: 0, total_pages: 0 } }))
      .mockResolvedValueOnce(response({ error: { code: 'CONFLICT', message: 'Código duplicado.' } }, 409));
    vi.stubGlobal('fetch', fetchMock);
    render(<Parameterization baseUrl="https://reference.example/api/v1" {...permissions} />);
    fireEvent.click(await screen.findByRole('button', { name: /MODALITY/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar valor' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Código'), { target: { value: 'PRESENTIAL' } });
    fireEvent.change(within(dialog).getByLabelText('Etiqueta'), { target: { value: 'Presencial' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Este código ya existe en este catálogo.');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('valida el tipo integer antes de enviar un parámetro', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => response({ data: [], pagination: { page: 1, page_size: 10, total_items: 0, total_pages: 0 } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Parameterization baseUrl="https://reference.example/api/v1" {...permissions} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Parámetros del sistema' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo parámetro' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Clave'), { target: { value: 'MAX_HOURS_PER_WEEK' } });
    fireEvent.change(within(dialog).getByLabelText('Valor'), { target: { value: 'abc' } });
    fireEvent.change(within(dialog).getByLabelText('Tipo de valor'), { target: { value: 'integer' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect((await within(dialog).findByRole('alert')).textContent).toContain('El valor debe ser un entero.');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

