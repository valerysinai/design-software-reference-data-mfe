import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { ParameterizationHubPage } from '../../src/adapter/in/pages/ParameterizationHubPage.js';

afterEach(cleanup);

const renderHub = (permissions: readonly string[]) => render(
  <MemoryRouter initialEntries={['/admin/parametrizacion']}>
    <Routes>
      <Route
        path="/admin/parametrizacion"
        element={<ParameterizationHubPage permissions={permissions} />}
      />
      <Route
        path="/admin/parametrizacion/curriculo"
        element={<h1>Destino currículo</h1>}
      />
    </Routes>
  </MemoryRouter>,
);

describe('ParameterizationHubPage', () => {
  it('monta únicamente las tarjetas autorizadas por RBAC', () => {
    renderHub(['ACADEMIC_PROGRAM_VIEW', 'IDENTITY_ROLE_VIEW']);

    expect(screen.getByRole('link', { name: /Currículo académico/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /RBAC — roles y permisos/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Geografía institucional/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Catálogos y parámetros/ })).toBeNull();
  });

  it('navega con el router compartido sin importar código de otro remote', () => {
    renderHub(['ACADEMIC_PROGRAM_VIEW']);

    fireEvent.click(screen.getByRole('link', { name: /Currículo académico/ }));

    expect(screen.getByRole('heading', { name: 'Destino currículo' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Parametrización' })).toBeNull();
  });

  it('no monta opciones sin feature confirmada y explica cuando no hay acceso', () => {
    renderHub(['MON_KPI_VIEW', 'ACT_INSTRUCTOR_MANAGE']);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(
      'No hay pantallas de parametrización disponibles',
    );
    expect(screen.queryByText('Catálogos de monitoreo')).toBeNull();
    expect(screen.queryByText('Estados de actores')).toBeNull();
  });
});
