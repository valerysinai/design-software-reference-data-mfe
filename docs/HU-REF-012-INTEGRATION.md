# HU-REF-012 — guía de integración frontend

Esta guía registra el límite frontend existente y los datos disponibles para el equipo que conectará plataforma, autenticación/RBAC y backend. La configuración y los esquemas descritos se basan en la copia local del contrato, que no se considera confirmación de aprobación vigente.

## Configuración y flujo existente

- `src/App.tsx` lee `VITE_REFERENCE_DATA_API_BASE_URL`; el valor debe incluir el prefijo `/api/v1` documentado. `.env.example` muestra la variable vacía, sin URL de ambiente ni credenciales.
- App conecta los hooks `useMacroregions`, `useMicroregions`, `useDepartments` y `useMunicipalities` con servicios específicos de `src/adapter/out/http/`. La selección del padre inmediato llega a cada hook dependiente; al cambiar la selección, App limpia sus descendientes.
- `src/adapter/out/http/referenceDataHttp.ts` centraliza actualmente el transporte mediante `fetch`, manejo de respuesta HTTP, abort signal y errores. No incorpora Bearer JWT ni obtiene tokens. Cuando la interfaz oficial esté disponible, sustituir/adaptar este límite al cliente de plataforma documentado; no agregar lectura local de tokens ni una API de plataforma inventada.
- La gestión permanece deshabilitada: `App.tsx` establece `canManage={false}` porque no hay una fuente real de permisos integrada.
- `src/domain/geography.ts` contiene DTO manuales/proyecciones de la copia OpenAPI disponible. No son tipos generados. `src/contracts/README.md` identifica el destino/origen previsto para tipos generados.

## Rutas y métodos en la copia local de OpenAPI

Base relativa a `VITE_REFERENCE_DATA_API_BASE_URL`:

| Recurso | Listar | Filtro de padre | Detalle | Crear | Actualizar | Desactivar |
|---|---|---|---|---|---|---|
| Macrorregión | `GET /macroregions` | — | `GET /macroregions/{id}` | `POST /macroregions` | `PUT /macroregions/{id}` | `DELETE /macroregions/{id}` |
| Microrregión | `GET /microregions` | `macroregion_id` | `GET /microregions/{id}` | `POST /microregions` | `PUT /microregions/{id}` | `DELETE /microregions/{id}` |
| Departamento | `GET /departments` | `microregion_id` | `GET /departments/{id}` | `POST /departments` | `PUT /departments/{id}` | `DELETE /departments/{id}` |
| Municipio | `GET /municipalities` | `department_id` | `GET /municipalities/{id}` | `POST /municipalities` | `PUT /municipalities/{id}` | `DELETE /municipalities/{id}` |

Los servicios actuales usan para cada listado `page` y `page_size`, más el filtro requerido por su nivel. Serializan consultas con `URLSearchParams` e identificadores de ruta con `encodeURIComponent`. La copia OpenAPI también declara `sort` y algunos filtros opcionales; no todos se envían desde el MFE.

## Solicitudes, respuestas y errores documentados localmente

El formulario captura el estado como `isActive` y lo entrega al callback existente. El DTO de lectura local representa el estado con `is_active`, pero los DTO de creación y actualización disponibles no declaran un campo de estado. Por eso la demostración local conserva el valor seleccionado y la integración HTTP no lo envía ni puede persistirlo con el contrato disponible. Se requiere confirmar/actualizar el contrato compartido antes de habilitar cambios de estado persistentes; no asumir un valor predeterminado del backend.

La copia OpenAPI define las creaciones con estos campos requeridos: macrorregión `{name, code}`; microrregión `{macroregion_id, name, code}`; departamento `{microregion_id, name, dane_code}`; municipio `{department_id, name, dane_code}`. Respuestas de lista: HTTP 200 con `{data, pagination}`. `pagination` contiene `page`, `page_size`, `total_items` y `total_pages`. Detalle/actualización documentan HTTP 200 con la entidad, creación HTTP 201 con la entidad y DELETE lógico HTTP 204 sin cuerpo. La copia compartida fija `page` desde 1, `page_size` entre 1 y 100, por defecto 20.

`_shared.yaml` define el error como `{error:{code,message,details?,trace_id?}}`; el transporte lee `error.code` y `error.message` y conserva el status HTTP en `ReferenceDataHttpError`. Cuando falla la red, muestra un mensaje genérico en español y deja que la UI ofrezca reintento; no convierte cancelaciones de consulta en errores visibles. El OpenAPI local incluye respuestas 401/403 y conflictos HTTP 409 genéricos; eso no verifica que cada ambiente/backend implemente actualmente dichas respuestas o códigos de negocio.

## Integración que sigue pendiente

### Autenticación y RBAC

La especificación local declara Bearer JWT y features `REF_HIERARCHY_VIEW` para lecturas y `REF_HIERARCHY_MANAGE` para mutaciones. La implementación actual no agrega Authorization. Mantener `canManage={false}` hasta integrar la API real de sesión/permisos. El equipo de plataforma debe proporcionar el paquete, versión aprobada, exports, mecanismo de inyección/contexto y API documentada para transporte, token y features. No inferir permisos a partir de roles generales del shell.

El punto localizado para cambiar transporte es `requestReferenceData` en `src/adapter/out/http/referenceDataHttp.ts`; la conexión RBAC se debe introducir en el contenedor (`src/App.tsx`) mediante la interfaz real de la plataforma una vez disponible.

### E3 — municipio referenciado por centro

El requisito esperado es bloquear la desactivación del municipio cuando un centro lo referencia. El código específico de negocio y el cuerpo acordado para este conflicto no están confirmados. No clasificar cualquier 409 como E3.

La extensión frontend debe hacerse en el `catch` de `confirmDeactivate` de `src/adapter/in/components/GeographyHierarchy.tsx`, comparando solo el código de error que backend publique. Añadir entonces una prueba del código confirmado en `tests/integration/GeographyHierarchy.test.tsx` y una prueba contra servicio integrado. La evidencia de backend disponible muestra una prueba que asocia un centro a un municipio y luego espera que DELETE devuelva 204 y que el municipio quede inactivo (`C:\design-software-reference-data-service\internal\adapter\in\http\hierarchy\hierarchy_integration_test.go`). E3 requiere cambio y nueva evidencia del equipo backend.

## Estado y fuente de los contratos

La copia examinada está en `design-software-docs/07-api/contracts/openapi/reference-data.yaml`, con componentes en `_shared.yaml`. `design-software-docs/07-api/README.md` y `openapi-contract-review.md` figuran en Revisión (2026-10-07), mientras la narrativa `09-microservices/services/02-reference-data-service/components/reference-data-api/contract.md` mantiene metadatos Aceptado de 2026-08-06. Esta discrepancia no permite determinar por sí sola cuál es la versión vigente aprobada.

La ubicación canónica que los documentos señalan es `design-software-shared-contracts/openapi/reference-data.yaml`, pero ese repositorio no está disponible en el workspace. Tampoco hay herramienta `openapi-typescript` en las dependencias instaladas del MFE ni tipos de API geográfica generados en `src/contracts/`. Cuando el equipo de contratos confirme la fuente y versión, sustituir las proyecciones manuales por el proceso reproducible aprobado; no editar artefactos generados a mano.

## Pruebas disponibles y pasos para integración

Las pruebas de servicios y hooks usan `fetch` simulado. `tests/integration/AppData.test.tsx` también indica que es simulación y no backend real. Las pruebas de `GeographyHierarchy` verifican presentación, formularios, navegación y callbacks con opciones de prueba. No existe evidencia local de llamadas autenticadas ni persistencia contra Reference Data real.

Orden recomendado para el equipo responsable:

1. Confirmar la versión aprobada del contrato y el proceso de generación de tipos.
2. Obtener e integrar el cliente oficial de plataforma, autenticación y fuente RBAC en los puntos indicados.
3. Acordar e implementar el conflicto E3 en backend y documentar status, código y cuerpo.
4. Habilitar `canManage` solo desde el permiso real y validar GET/POST/PUT/DELETE contra ambiente autenticado.
5. Ejecutar pruebas integradas con backend y montaje real del shell; las pruebas simuladas actuales no sustituyen esa validación.
