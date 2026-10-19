# QA - HU-REF-014

## Hallazgos y correcciones

| Hallazgo | Causa | Solucion | Estado |
|---|---|---|---|
| Busqueda por nombre de una palabra no filtraba | La UI usaba la presencia de espacios para elegir entre codigo y nombre | Los codigos con formato `A-Z`, numeros y guion bajo se consultan con `GET /catalogs`; los nombres se normalizan y se filtran solo sobre la pagina cargada | Corregido |
| No habia accion visible para editar catalogos | El modal y el PUT existian, pero no habia accion en el encabezado del catalogo seleccionado | Se agrego boton de lapiz, visible solo con `REF_CATALOG_MANAGE`, con precarga, PUT y refresh posterior | Corregido |
| Estado de paginacion mostraba carga tras lista vacia | La paginacion interpretaba ausencia de metadatos como carga | `Pagination` recibe el estado `loading` y muestra `No hay registros disponibles.` al finalizar sin resultados | Corregido |
| Generacion OpenAPI no era reproducible fuera del workspace | El script dependia de un repositorio hermano no distribuido | Se documenta el origen aprobado y la necesidad pendiente de publicar `shared-contracts`; no se invento una copia ni una URL mutable | Pendiente de decision de distribucion |

## Pruebas agregadas

- `tests/integration/Parameterization.qa.test.tsx`: nombres de una y varias palabras, consulta de codigo, respuesta obsoleta y lista vacia.
- `tests/integration/CatalogEdit.qa.test.tsx`: visibilidad por permiso, precarga, PUT y edicion sin permiso.

## Regeneracion OpenAPI

`npm run generate:types` genera `src/contracts/reference-data.generated.ts` con `openapi-typescript@7.13.0`. El YAML disponible declara `info.version: 1.0.0` y se encuentra en `design-software-docs/07-api/contracts/openapi/reference-data.yaml`. Puede usarse `REFERENCE_DATA_CONTRACT=<ruta-al-contrato-versionado>` para seleccionar el artefacto aprobado. En este workspace existe un fallback local; en un clon QA el equipo todavía debe publicar o suministrar ese artefacto versionado.

PowerShell: `$env:REFERENCE_DATA_CONTRACT='C:\ruta\reference-data.yaml'; npm run generate:types`.
macOS/Linux: `REFERENCE_DATA_CONTRACT=/ruta/reference-data.yaml npm run generate:types`.

## E5

No se agrego widget de `GET /reports/active-catalog`: los flujos de `06-backoffice` describen mantenimiento de catalogos y parametros, no un reporte visual. El endpoint queda en el contrato para consumidores de precarga y su backend sigue pendiente.

## Evidencia visual

Las referencias disponibles en este workspace son preliminares (`ESTADO: PRELIMINAR (v0)`):

- `design-software-docs/12-ux-ui/mockup-ddd/flows/06-backoffice.md`, Pantalla 4.
- `design-software-docs/12-ux-ui/mockup-ddd/ux-flows.md`, flujo 8.D.
- `design-software-docs/12-ux-ui/mockup-ddd/mockups/app/reference/screens.js`.

Describen las pestañas Catálogos/Parámetros, maestro-detalle, tablas, formularios CRUD y paginación. No hay un enlace a un Figma aprobado ni un widget del reporte E5 en esas referencias. La interfaz puede revisarse ejecutando el MFE con mocks de Vitest; esos mocks no se incluyen en producción ni simulan persistencia. La aprobación visual definitiva requiere que UX/Product entregue o confirme el enlace de Figma vigente.

## Limitaciones

Los endpoints del microservicio aun no tienen handlers funcionales y `frontend-platform` no esta disponible. Los servicios usan `requestReferenceData`, sin tokens simulados ni mocks de produccion.

## Estabilidad de pruebas - segunda ronda

La prueba que agotaba el timeout estándar era `tests/integration/AppData.test.tsx`,
en el escenario de creación y edición local de los cuatro niveles geográficos.
El escenario ejecuta muchas interacciones y montajes de formularios en jsdom; el
paralelismo de diez archivos elevaba la creación de entornos y provocaba superar
los 5 segundos. No había promesas de red pendientes ni mocks sin limpiar:
`afterEach` ejecuta `cleanup`, `vi.unstubAllEnvs` y `vi.unstubAllGlobals`.

La corrección limita la suite a un worker (`maxWorkers: 1`) y asigna 15 segundos
solo a esa prueba larga. No se aumentó globalmente el timeout ni se omitieron
escenarios. `npm test` se ejecutó tres veces consecutivas, cada una con 10
archivos y 59 pruebas aprobadas. También pasaron typecheck, lint y build; se
generó `dist/remoteEntry.js`.

## Correcciones finales de interfaz y demo

- El encabezado cambia a `Parametrización / catálogos` y su subtítulo cuando se abre la sección de catálogos/parámetros; el encabezado geográfico se conserva en las otras secciones.
- El panel de detalles conserva sus cinco columnas aun sin selección y muestra un estado contextual dentro de la tabla. `Agregar valor` permanece visible y queda deshabilitado sin catálogo seleccionado o sin permiso de gestión.
- El modo demo se activa solo en desarrollo (`import.meta.env.DEV`) cuando `VITE_REFERENCE_DATA_API_BASE_URL` está vacío. Usa `useParameterizationDemo`, no llama a `fetch`, permite selección y CRUD local y no se activa cuando existe una URL de API.
- La referencia V2 indicada por QA no pudo abrirse desde el navegador de consulta; las diferencias se limitaron a requisitos explícitos verificables del ticket. La documentación local de UX continúa marcada como preliminar v0, por lo que la validación visual final requiere confirmación de UX/Product.
