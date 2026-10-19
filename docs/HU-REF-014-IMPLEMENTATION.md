# HU-REF-014 — Implementación frontend

La sección **Catálogos y parámetros** consume exclusivamente el contrato de
`design-software-docs/07-api/contracts/openapi/reference-data.yaml`.

## Límites conocidos

- El repositorio `reference-data-service` aún no contiene handlers para
  `/catalogs`, `/catalogs/{catalog_id}/details` ni `/parameters`; la UI queda
  preparada contra el contrato, pero la integración real requiere publicar
  primero esas rutas.
- `frontend-platform` no está disponible en este workspace. El cliente HTTP
  conserva el patrón existente y no simula JWT ni añade tokens. La inyección de
  `Authorization` debe conectarse cuando el host exponga la fachada oficial.
- El contrato permite filtrar catálogos por `code`. La búsqueda por nombre se
  limita a los registros de la página cargada y no descarga páginas adicionales.
- `GET /reports/active-catalog` no se muestra como widget en esta pantalla. La
  especificación de `06-backoffice` (Pantalla 4, Parametrización / catálogos)
  define únicamente las pestañas de catálogos y parámetros, con sus listados,
  formularios y paginación; no define una tarjeta, tabla, KPI ni acción de
  reporte consolidado.

## Decisión E5 — Reporte consolidado de catálogos activos

E5 no exige una visualización adicional dentro de `reference-data-mfe`.

La evidencia revisada es:

- `12-ux-ui/mockup-ddd/flows/06-backoffice.md`, Pantalla 4: los endpoints
  enumerados son `GET/POST/PUT/DELETE /catalogs`, los endpoints anidados de
  `catalog_detail` y `GET/POST/PUT /parameters`. No aparece
  `/reports/active-catalog` ni un widget asociado.
- `12-ux-ui/mockup-ddd/ux-flows.md`, flujo 8.D: describe exclusivamente el
  mantenimiento de catálogos, valores y parámetros mediante la pantalla y sus
  modales.
- `12-ux-ui/mockup-ddd/mockups/app/reference/screens.js`: el mockup de
  `parametersList` contiene el layout maestro-detalle y la tabla de parámetros,
  sin reporte consolidado.
- `reference-data.yaml`, operación `reportActiveCatalog`: define un reporte
  de solo lectura que devuelve una página de `ActiveCatalogReportEntry`, cada
  entrada con `catalog_code`, `catalog_name` y sus detalles activos
  (`code`, `label`, `display_order`).

El contrato indica expresamente que su propósito es precargar en una sola
llamada los selects/dropdowns parametrizados y lista como consumidores al
frontend, `academic-management-service`, `training-environment-service` y
`actors-service`. También indica cacheo con TTL en el consumidor. Esto describe
una API de consumo para otros flujos, no un reporte administrativo que deba
duplicar la pantalla de mantenimiento.

El permiso requerido es `REF_CATALOG_VIEW`; no habilita escritura ni implica
que deba mostrarse una tarjeta en Parametrización.

Por lo tanto, E5 queda satisfecha en el frontend de esta HU al no agregar un
widget no especificado y al dejar documentada la responsabilidad del endpoint.
La implementación del endpoint sigue pendiente en `reference-data-service`,
que actualmente no contiene handlers reales para reportes ni para catálogos.
Si un consumidor futuro necesita precarga de catálogos, deberá integrar el
reporte con su propio hook/cache, respetando el contrato y el permiso
`REF_CATALOG_VIEW`.

## QA - correcciones aplicadas

- La busqueda por nombre se realiza sobre los registros cargados, sin confundirla con un filtro global. Los codigos se envian al endpoint contractual.
- El catalogo seleccionado dispone de edicion visible solo con `REF_CATALOG_MANAGE`; el PUT refresca el listado y conserva el modal ante errores.
- Los estados de carga, error y lista vacia estan separados.
- El detalle completo de pruebas y la limitacion de distribucion del contrato OpenAPI estan en `docs/QA-HU-REF-014-FIXES.md`.
- Una consulta en estado `loading` muestra el indicador de carga; una respuesta exitosa con `total_items: 0` muestra `No hay registros disponibles.` y oculta los controles de paginacion; con resultados se muestran tabla y metadatos de pagina.
- La suite Vitest usa un worker para evitar contencion de entornos jsdom; solo el escenario largo de geografia local tiene timeout de 15 segundos. El resto conserva el timeout por defecto.
- En desarrollo local sin `VITE_REFERENCE_DATA_API_BASE_URL`, la sección usa registros demo aislados en `useParameterizationDemo`; con una URL configurada se mantienen exclusivamente los servicios HTTP.
- El panel de detalles y el botón `Agregar valor` permanecen visibles sin selección; la tabla muestra sus cinco columnas y el botón queda deshabilitado hasta seleccionar un catálogo y contar con permiso de gestión.

## Permisos

La sección y sus acciones se controlan mediante las features entregadas por el
host:

- `REF_CATALOG_VIEW` / `REF_CATALOG_MANAGE`
- `REF_PARAMETER_VIEW` / `REF_PARAMETER_MANAGE`

El backend continúa siendo la autoridad para autorización.

