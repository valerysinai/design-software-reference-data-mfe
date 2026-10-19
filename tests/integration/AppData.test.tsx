import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../../src/App.js';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('App con respuestas HTTP simuladas (no es integración contra backend)', () => {
  it('muestra la tabla, el estado real de la respuesta y el paginador al completar GET', async () => {
    vi.stubEnv('VITE_REFERENCE_DATA_API_BASE_URL', 'https://reference.example/api/v1');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: 'macro-1', name: 'Macrorregión real de prueba', code: 'MCR', is_active: true }],
      pagination: { page: 1, page_size: 10, total_items: 1, total_pages: 1 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(screen.getByRole('heading', { name: 'Parametrización — Geografía institucional' })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(await screen.findByRole('button', { name: 'Macrorregión real de prueba' })).toBeTruthy();
    expect(screen.getByText('Activo')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Paginación de macrorregiones' })).toBeTruthy());
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeTruthy();
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toBe('/api/v1/macroregions');
  });

  it('muestra explícitamente el error HTTP y permite reintentar la consulta', async () => {
    vi.stubEnv('VITE_REFERENCE_DATA_API_BASE_URL', 'https://reference.example/api/v1');
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Servicio temporalmente fuera de línea.' } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [], pagination: { page: 1, page_size: 10, total_items: 0, total_pages: 0 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect((await screen.findByRole('alert')).textContent).toContain('Servicio temporalmente fuera de línea.');
    screen.getByRole('button', { name: 'Reintentar consulta' }).click();
    await waitFor(() => expect(screen.getByText('No hay registros para mostrar.')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('presenta un error de red genérico y permite reintentar sin introducir filas ficticias', async () => {
    vi.stubEnv('VITE_REFERENCE_DATA_API_BASE_URL', 'https://reference.example/api/v1');
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ id: 'macro-2', name: 'Macrorregión recuperada', code: 'REC', is_active: false }],
        pagination: { page: 1, page_size: 10, total_items: 1, total_pages: 1 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'No fue posible conectar con Reference Data.',
    );
    expect(screen.queryByText('Macrorregión recuperada')).toBeNull();

    screen.getByRole('button', { name: 'Reintentar consulta' }).click();
    expect(await screen.findByRole('button', { name: 'Macrorregión recuperada' })).toBeTruthy();
    expect(screen.getByText('Inactivo')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Paginación de macrorregiones' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('abre los formularios de los tres niveles hijos en App y explica que aún no hay padres', () => {
    vi.stubEnv('VITE_REFERENCE_DATA_API_BASE_URL', '');
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    const children = [
      { tab: 'Microrregiones', button: 'Nueva microrregión', form: 'Crear Microrregiones', parent: 'Macrorregión' },
      { tab: 'Departamentos', button: 'Nuevo departamento', form: 'Crear Departamentos', parent: 'Microrregión' },
      { tab: 'Municipios', button: 'Nuevo municipio', form: 'Crear Municipios', parent: 'Departamento' },
    ];
    for (const child of children) {
      fireEvent.click(screen.getByRole('tab', { name: child.tab }));
      fireEvent.click(screen.getByRole('button', { name: child.button }));
      const form = screen.getByRole('form', { name: child.form });
      expect(within(form).getByLabelText(new RegExp(child.parent))).toBeTruthy();
      expect(within(form).getByRole('status').textContent).toContain('No hay');
      expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).disabled).toBe(true);
      fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('form')).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('crea y edita los cuatro niveles solo en la sesión local y no envía solicitudes HTTP', async () => {
    vi.stubEnv('VITE_REFERENCE_DATA_API_BASE_URL', '');
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    const createLocal = (buttonName: string, formName: string, name: string, codeLabel: RegExp, code: string, parentId?: string) => {
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      const form = screen.getByRole('form', { name: formName });
      if (parentId) {
        expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe(parentId);
      }
      fireEvent.change(within(form).getByLabelText(/Nombre/), { target: { value: name } });
      fireEvent.change(within(form).getByLabelText(codeLabel), { target: { value: code } });
      fireEvent.change(within(form).getByRole('combobox', { name: /Estado/ }), { target: { value: 'true' } });
      fireEvent.submit(form);
    };
    const editLocal = async (
      existingName: string,
      formName: string,
      updatedName: string,
      codeLabel: RegExp,
      currentCode: string,
      updatedCode: string,
      parentId?: string,
      newParentId?: string,
    ) => {
      fireEvent.click(screen.getByRole('button', { name: `Editar ${existingName}` }));
      const form = screen.getByRole('form', { name: formName });
      const codeField = within(form).getByLabelText(codeLabel) as HTMLInputElement;
      expect(codeField.value).toBe(currentCode);
      const statusField = within(form).getByRole('combobox', { name: /Estado/ }) as HTMLSelectElement;
      expect(statusField.value).toBe('true');
      fireEvent.change(codeField, { target: { value: updatedCode } });
      fireEvent.change(statusField, { target: { value: 'false' } });
      if (parentId) {
        const parentSelect = within(form).getAllByRole('combobox')[0] as HTMLSelectElement;
        expect(parentSelect.value).toBe(parentId);
        if (newParentId) fireEvent.change(parentSelect, { target: { value: newParentId } });
      }
      fireEvent.change(within(form).getByLabelText(/Nombre/), { target: { value: updatedName } });
      fireEvent.submit(form);
      await screen.findByRole('button', { name: updatedName });
      expect(screen.getAllByRole('button', { name: updatedName })).toHaveLength(1);
      expect(screen.queryByRole('button', { name: existingName })).toBeNull();
      expect(screen.getByRole('cell', { name: updatedCode })).toBeTruthy();
      expect(screen.getByText('Inactivo')).toBeTruthy();
    };

    createLocal('Nueva macrorregión', 'Crear Macrorregiones', 'Macro demo', /Código/, 'MD');
    expect(await screen.findByRole('button', { name: 'Macro demo' })).toBeTruthy();
    await editLocal('Macro demo', 'Editar Macrorregiones', 'Macro demo editada', /Código/, 'MD', 'MDE');
    expect(screen.getByText('Demo local')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Editar Macro demo editada' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Desactivar Macro demo editada' }) as HTMLButtonElement).disabled).toBe(true);
    createLocal('Nueva macrorregión', 'Crear Macrorregiones', 'Macro dos', /Código/, 'M2');
    expect(await screen.findByRole('button', { name: 'Macro dos' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Macro demo editada' }));

    createLocal('Nueva microrregión', 'Crear Microrregiones', 'Micro demo', /Código/, 'MCD', 'demo:macroregion:1');
    expect(await screen.findByRole('button', { name: 'Micro demo' })).toBeTruthy();
    await editLocal('Micro demo', 'Editar Microrregiones', 'Micro demo editada', /Código/, 'MCD', 'MCD2', 'demo:macroregion:1', 'demo:macroregion:2');
    expect(screen.getByRole('cell', { name: 'Macro dos' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Micro demo editada' }));

    createLocal('Nuevo departamento', 'Crear Departamentos', 'Depto demo', /Código DANE/, '01001', 'demo:microregion:3');
    expect(await screen.findByRole('button', { name: 'Depto demo' })).toBeTruthy();
    await editLocal('Depto demo', 'Editar Departamentos', 'Depto demo editado', /Código DANE/, '01001', '01002', 'demo:microregion:3');
    fireEvent.click(screen.getByRole('button', { name: 'Depto demo editado' }));

    createLocal('Nuevo municipio', 'Crear Municipios', 'Municipio demo', /Código DANE/, '01001001', 'demo:department:4');
    expect(await screen.findByRole('button', { name: 'Municipio demo' })).toBeTruthy();
    await editLocal('Municipio demo', 'Editar Municipios', 'Municipio demo editado', /Código DANE/, '01001001', '01001002', 'demo:department:4');
    expect(screen.getByText('Demo local')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('No se envio ni guardo en el servidor');
    expect(fetchMock).not.toHaveBeenCalled();
  }, 15000);
});
