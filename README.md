# design-software-reference-data-mfe (React 18 + TypeScript + Vite)

Micro-frontend **remote** del dominio `reference-data`. Construido con Vite y Module Federation 2.0
(`@module-federation/vite`), conforme a ADR-009. Consume solo SU contrato, se despliega de forma
independiente y es responsive.

## Identidad del remote

| Dato                    | Valor                         |
| ----------------------- | ----------------------------- |
| Nombre de federacion    | `referenceDataMfe`          |
| Modulo expuesto         | `./App`                     |
| Entrada federada        | `remoteEntry.js`            |
| Puerto de desarrollo    | `5105`                      |
| Ruta que monta el shell | `/reference-data/*`         |
| Ancla de estilos        | `data-mfe="reference-data"` |
| Forma expuesta          | `ReferenceDataMfeProps`     |

## Contrato OpenAPI que consumira

| Fuente               | Ruta                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| Contrato canonico    | `design-software-shared-contracts/openapi/reference-data.yaml`      |
| Copia actual en docs | `design-software-docs/07-api/contracts/openapi/reference-data.yaml` |
| Tipos generados      | `src/contracts/`                                                    |

Los tipos se generan con `openapi-typescript` desde el OpenAPI; no se escriben a mano. Este
scaffolding no inventa endpoints: hasta que el contrato este publicado, `src/contracts/` solo
contiene el placeholder de la forma del remote.

## Estructura

```text
src/
  domain/                modelos, value objects y reglas de UI puras (sin React, sin fetch)
  application/           hooks de caso de uso (uno por HU) y puertos de servicios
  adapter/in/pages/      containers; consumen hooks de application/
  adapter/in/components/ componentes presentacionales (reciben props, sin logica de datos)
  adapter/out/           implementaciones de los puertos (HTTP via frontend-platform, mapeo DTO<->dominio)
  contracts/             tipos generados desde el OpenAPI + forma expuesta del remote
  App.tsx                remote component expuesto como './App' (sin createRoot)
  App.module.css         estilos aislados con CSS Modules
  main.tsx               bootstrap standalone SOLO para desarrollo local
  vite-env.d.ts          tipos de Vite (imports de CSS Modules)
tests/
  unit/                  tests de dominio y de hooks de application/
  integration/           tests de adapter/in con Testing Library
```

Regla de dependencia (ADR-009 seccion 3): `adapter/in` -> `application` -> `domain`.
`domain` no importa React ni ningun cliente HTTP. Ningun `fetch` ni `localStorage` directo:
todo pasa por la fachada `design-software-frontend-platform`.

## Comandos

| Comando               | Que hace                                                                  |
| --------------------- | ------------------------------------------------------------------------- |
| `npm run dev`       | Levanta Vite en el puerto`5105` con federation activa                   |
| `npm run build`     | `tsc --noEmit` y despues build de produccion (emite `remoteEntry.js`) |
| `npm run preview`   | Sirve el build de produccion                                              |
| `npm run typecheck` | `tsc --noEmit`                                                          |
| `npm run test`      | `vitest run` (jsdom)                                                    |
| `npm run lint`      | `eslint .`                                                              |

## ADRs aplicables

- **ADR-009** — Framework y estrategia de build de los micro-frontends: React 18 + TypeScript,
  Vite + `@module-federation/vite`, capas internas, CSS Modules, `data-mfe`, tipos desde el
  contrato y gate de compatibilidad host<->remote.
- **ADR-005** — Topologia de microservicios: un remote por dominio, despliegue independiente,
  1:1 con el `<dominio>-service`.
- **ADR-006** — Principio DDD + Hexagonal + TDD + SDD: reglas de dependencia, prohibiciones de
  codigo y convenciones de nombre.

## Integración geográfica en progreso

- Configure `VITE_REFERENCE_DATA_API_BASE_URL` con la URL de Reference Data incluyendo `/api/v1`;
  `.env.example` deja el valor vacío y no contiene credenciales.
- La capa HTTP local usa `fetch` del navegador a través de adaptadores sustituibles en
  `src/adapter/out/http/`. La plataforma oficial no está disponible en este workspace. El
  contrato local exige Bearer JWT, por lo que la autenticación y RBAC siguen pendientes; un
  `401`/`403` se muestra como error HTTP y las acciones de escritura permanecen deshabilitadas.
- `reference-data.yaml` disponible en `design-software-docs` está en revisión general. Los DTO
  locales son proyecciones tipadas para preparar esa integración, no tipos generados ni evidencia
  de contrato aprobado. Sustituirlos por generación reproducible cuando se publique la fuente
  canónica en `design-software-shared-contracts`.
- E3 sigue bloqueado: la prueba actual del servicio permite desactivar un municipio referenciado
  por un centro. No se asigna un significado especial a `409` sin un código de negocio confirmado.

## Centros de formación y sedes

- La sección **Centros y sedes** consume `training-centers` e `institutional-units` por los
  adaptadores HTTP y hooks de `application/`. Usa `useMunicipalities` para el selector de
  municipio; su modo de listado sin `department_id` es opcional y no altera el flujo geográfico.
- El host debe pasar `permissions` en `ReferenceDataMfeProps`. La sección no se monta en el remote
  si falta `REF_HIERARCHY_MANAGE`; el shell también debe proteger su ruta y el backend sigue
  validando el permiso. `main.tsx` habilita el permiso solo para la ejecución local del MFE.
- `center_code` se deshabilita en edición y no se envía en `PUT`. Un `409` al crear centro se
  presenta inline en el campo de código. La desactivación llama `DELETE` y el filtro `is_active`
  permite consultar filas activas e inactivas. `unit_type` se transmite como texto restringido a
  `ACADEMIC`, `ADMINISTRATIVE` o `MIXED`, nunca como enum de PostgreSQL.
- El YAML canónico `reference-data.yaml` no está disponible en este workspace. Por eso los tipos
  nuevos de la API son proyecciones locales tipadas, no archivos OpenAPI generados; deben
  sustituirse por tipos generados cuando la fuente canónica esté accesible. El teléfono se usa
  únicamente en el formulario y el cuerpo HTTP: no se escribe en consola ni en telemetría.

## Notas

- `react`, `react-dom` y `react-router-dom` estan en `shared` como `singleton`: sin esto el shell
  y el remote cargan instancias distintas y falla `useContext`/`useNavigate`.
- `src/main.tsx` es el bootstrap standalone para `npm run dev`. **No** es el entry federado: el
  shell carga `remoteEntry.js` y monta `referenceDataMfe/App`.
- Aislamiento de estilos con CSS Modules; ningun selector global fuera de
  `design-software-design-system`.
- El shell resuelve la URL de `remoteEntry.js` por ambiente (`remotes.<env>.json`), nunca se
  hardcodea en este repo.
- `src/main.tsx` crea un `BrowserRouter` solo para inspeccionar las rutas en desarrollo local.
  Los módulos federados no crean un router: en la aplicación integrada, el historial es único
  y lo crea el shell.
- En desarrollo, `/admin/parametrizacion` muestra todas las tarjetas confirmadas. El parámetro
  `?permissions=none` permite verificar visualmente el estado sin permisos; también admite una
  lista de permisos separada por comas para comprobar el filtrado RBAC.
