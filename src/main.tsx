import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useSearchParams,
} from 'react-router-dom';

import App from './App.js';
import ParameterizationHub from './ParameterizationHub.js';

const standalonePermissions = [
  'ACADEMIC_PROGRAM_VIEW',
  'SCH_CREATE',
  'ENV_MANAGE',
  'REF_HIERARCHY_MANAGE',
  'IDENTITY_ROLE_VIEW',
  'REF_CATALOG_VIEW',
  'REF_CATALOG_MANAGE',
  'REF_PARAMETER_VIEW',
  'REF_PARAMETER_MANAGE',
] as const;

function StandaloneParameterizationHub() {
  const [searchParams] = useSearchParams();
  const permissionParam = searchParams.get('permissions');
  const permissions = permissionParam === null
    ? standalonePermissions
    : permissionParam
      .split(',')
      .map((permission) => permission.trim())
      .filter((permission) => permission && permission !== 'none');

  return <ParameterizationHub permissions={permissions} />;
}

function StandaloneRemoteNotice() {
  return (
    <main>
      <h1>Pantalla administrada por otro micro-frontend</h1>
      <p>En la aplicación integrada, el shell carga el remote propietario de esta ruta.</p>
      <Link to="/admin/parametrizacion">Volver a Parametrización</Link>
    </main>
  );
}

export function StandaloneRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/admin/parametrizacion" />} />
      <Route
        path="/admin/parametrizacion"
        element={<StandaloneParameterizationHub />}
      />
      <Route
        path="/admin/parametrizacion/geografia"
        element={<App permissions={standalonePermissions} />}
      />
      <Route
        path="/backoffice/parametrizacion"
        element={<App permissions={standalonePermissions} />}
      />
      <Route
        path="/admin/datos-referencia"
        element={<App permissions={standalonePermissions} />}
      />
      <Route path="*" element={<StandaloneRemoteNotice />} />
    </Routes>
  );
}

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <StandaloneRoutes />
      </BrowserRouter>
    </StrictMode>,
  );
}
