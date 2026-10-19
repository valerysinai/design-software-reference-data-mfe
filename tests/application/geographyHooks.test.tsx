import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDepartments } from '../../src/application/useDepartments.js';
import { useMacroregions } from '../../src/application/useMacroregions.js';
import { useMicroregions } from '../../src/application/useMicroregions.js';
import { useMunicipalities } from '../../src/application/useMunicipalities.js';

const pageResponse = (data: unknown[], page = 1, pageSize = 10, totalItems = data.length) => new Response(JSON.stringify({
  data,
  pagination: { page, page_size: pageSize, total_items: totalItems, total_pages: Math.ceil(totalItems / pageSize) },
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

const row = (id: string) => ({ id, name: `Registro ${id}`, code: id, is_active: true });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('hooks geográficos (unitarios con HTTP simulado)', () => {
  it('carga macrorregiones, conserva metadatos de paginación y trata resultados vacíos como éxito', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(pageResponse([row('macro-1')], 1, 10, 13))
      .mockResolvedValueOnce(pageResponse([], 1, 10, 0));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useMacroregions('https://reference.example/api/v1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.pagination).toEqual({ page: 1, page_size: 10, total_items: 13, total_pages: 2 });
    expect(result.current.error).toBeUndefined();

    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.items).toHaveLength(0));
    expect(result.current.error).toBeUndefined();
  });

  it('no consulta microrregiones sin padre y cambia de padre sin exponer ni aceptar resultados obsoletos', async () => {
    let finishOld: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn<typeof fetch>((input) => {
      const url = new URL(String(input));
      if (url.searchParams.get('macroregion_id') === 'macro-old') {
        return new Promise((resolve) => { finishOld = resolve; });
      }
      return Promise.resolve(pageResponse([{ ...row('micro-new'), macroregion_id: 'macro-new' }]));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(
      ({ parent }: { parent?: string }) => useMicroregions('https://reference.example/api/v1', parent),
      { initialProps: { parent: undefined } },
    );
    expect(fetchMock).not.toHaveBeenCalled();

    rerender({ parent: 'macro-old' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender({ parent: 'macro-new' });
    await waitFor(() => expect(result.current.items[0]?.id).toBe('micro-new'));
    await act(async () => { finishOld?.(pageResponse([{ ...row('micro-old'), macroregion_id: 'macro-old' }])); });
    expect(result.current.items.map((item) => item.id)).toEqual(['micro-new']);
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.get('macroregion_id')).toBe('macro-new');
  });

  it('filtra departamentos, mantiene paginación por servidor y reinicia la página si cambia el padre', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(pageResponse([{ ...row('dept-1'), microregion_id: 'micro-1' }], 2, 10, 11));
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(
      ({ parent }: { parent: string }) => useDepartments('https://reference.example/api/v1', parent),
      { initialProps: { parent: 'micro-1' } },
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.pagination?.total_pages).toBe(2);
    act(() => result.current.setPage(2));
    await waitFor(() => expect(new URL(String(fetchMock.mock.calls.at(-1)?.[0])).searchParams.get('page')).toBe('2'));
    rerender({ parent: 'micro-2' });
    await waitFor(() => expect(new URL(String(fetchMock.mock.calls.at(-1)?.[0])).searchParams.get('microregion_id')).toBe('micro-2'));
    expect(new URL(String(fetchMock.mock.calls.at(-1)?.[0])).searchParams.get('page')).toBe('1');
  });

  it('municipios propaga errores HTTP y mantiene datos vacíos, no una respuesta exitosa inventada', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Sin permiso de consulta.' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useMunicipalities('https://reference.example/api/v1', 'department-1'));

    await waitFor(() => expect(result.current.error?.message).toBe('Sin permiso de consulta.'));
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
