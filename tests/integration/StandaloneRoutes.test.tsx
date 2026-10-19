import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { StandaloneRoutes } from '../../src/main.js';

afterEach(cleanup);

const renderRoute = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <StandaloneRoutes />
  </MemoryRouter>,
);

describe('StandaloneRoutes', () => {
  it('hace visible el hub desde la ruta raíz de desarrollo', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Parametrización' })).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(7);
  });

  it('permite regresar desde Geografía al hub de parametrización', async () => {
    renderRoute('/admin/parametrizacion/geografia');

    fireEvent.click(screen.getByRole('link', { name: 'Parametrización' }));

    expect(await screen.findByRole('heading', { name: 'Parametrización' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Geografía institucional/ })).toBeTruthy();
  });

  it('permite verificar visualmente el estado sin permisos en desarrollo local', () => {
    renderRoute('/admin/parametrizacion?permissions=none');

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(
      'No hay pantallas de parametrización disponibles',
    );
  });

  it('explica las rutas que en desarrollo pertenecen a otro remote', () => {
    renderRoute('/admin/parametrizacion/curriculo');

    expect(screen.getByRole('heading', {
      name: 'Pantalla administrada por otro micro-frontend',
    })).toBeTruthy();
  });
});
