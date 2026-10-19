import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Parameterization } from '../../src/adapter/in/components/Parameterization.js';

const permissions = { canViewCatalogs: true, canManageCatalogs: true, canViewParameters: true, canManageParameters: true };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const catalogPage = { data: [{ id: 'c1', code: 'MODALITY', name: 'Modalidad', description: null, is_active: true, created_at: '' }], pagination: { page: 1, page_size: 10, total_items: 1, total_pages: 1 } };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('edición de catálogos', () => {
  it('muestra el botón con permiso, precarga y envía PUT', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response(catalogPage))
      .mockResolvedValueOnce(response({ data: [], pagination: { page: 1, page_size: 10, total_items: 0, total_pages: 0 } }))
      .mockResolvedValueOnce(response({ id: 'c1', code: 'MODALITY', name: 'Modalidad actualizada', description: null, is_active: true, created_at: '' }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Parameterization baseUrl="https://reference.example/api/v1" {...permissions} />);
    fireEvent.click(await screen.findByRole('button', { name: /MODALITY/ }, { timeout: 5000 }));
    const editButton = screen.getByRole('button', { name: /Editar catálogo MODALITY/i });
    expect(editButton.getAttribute('title')).toBe('Editar catálogo');
    expect(editButton.getAttribute('aria-label')).toBe('Editar catálogo MODALITY');
    fireEvent.click(editButton);
    const dialog = screen.getByRole('dialog');
    expect((within(dialog).getByLabelText('Nombre') as HTMLInputElement).value).toBe('Modalidad');
    fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'Modalidad actualizada' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'PUT' });
  });

  it('oculta el botón de edición sin permiso de administración', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response(catalogPage)));
    render(<Parameterization baseUrl="https://reference.example/api/v1" canViewCatalogs canManageCatalogs={false} canViewParameters={false} canManageParameters={false} />);
    fireEvent.click(await screen.findByRole('button', { name: /MODALITY/ }, { timeout: 5000 }));
    expect(screen.queryByRole('button', { name: /Editar catalogo/i })).toBeNull();
  });
});
