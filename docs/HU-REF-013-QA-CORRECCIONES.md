# Correcciones QA - HU-REF-013

## Objetivo

Corregir los hallazgos reportados por QA para la entrega **HU-REF-013 - Gestion de Centros y Ubicaciones de Formacion (MFE)** en el microfrontend `reference-data-mfe`, alineando la interfaz con las especificaciones visuales de Figma y habilitando la validacion funcional en modo demo sin depender del backend.

## Resumen

Se aplicaron ajustes sobre la pantalla de **Centros de formacion** y **Unidades institucionales (sedes)** para resolver las discrepancias visuales y funcionales reportadas por QA.

Cambios realizados:

- Se habilito un **modo demo local** cuando no esta configurada la variable `VITE_REFERENCE_DATA_API_BASE_URL`.
- Los botones de creacion ya no quedan deshabilitados en modo standalone/demo.
- Se agregaron datos demo para centros de formacion, unidades institucionales y municipios.
- Se actualizo la tabla de centros para incluir las columnas requeridas por Figma:
  - Codigo
  - Nombre
  - Municipio
  - Direccion
  - Telefono
  - Estado
  - Acciones
- Se agrego el subtitulo descriptivo del panel: "Cada centro se ubica en un municipio y agrupa sedes/unidades y ambientes."
- Se ajustaron los botones institucionales de creacion con icono `+`.
- Se reemplazo la accion textual `Editar` por un boton con icono de lapiz.
- Se renderizaron los estados como insignias tipo pildora:
  - `✓ Activo` en verde.
  - `🔒 Inactivo` en gris.
- Se mantuvo la accesibilidad mediante `aria-label` en las acciones por icono.
- Se conservaron las reglas funcionales existentes:
  - `center_code` permanece deshabilitado en edicion.
  - El payload de actualizacion no envia `center_code`.
  - El conflicto `409` por codigo duplicado se muestra inline.
  - El telefono continua sin registrarse en consola ni telemetria.

## Evidencia

Archivos modificados:

- `src/adapter/in/components/InstitutionalStructure.tsx`
- `src/adapter/in/components/InstitutionalStructure.module.css`
- `src/application/useTrainingCenters.ts`
- `src/application/useInstitutionalUnits.ts`
- `src/application/useMunicipalities.ts`

Validaciones ejecutadas:

```bash
npm.cmd run lint
```

Resultado:

```txt
0 errores ESLint
```

```bash
npm.cmd test
```

Resultado:

```txt
Test Files  6 passed (6)
Tests       48 passed (48)
```

```bash
npm.cmd run build
```

Resultado:

```txt
✓ built successfully
dist/remoteEntry.js generado correctamente
```

Nota tecnica:

Las pruebas y el build requirieron ejecucion fuera del sandbox debido a un error de Vite en Windows:

```txt
spawn EPERM
```

Al ejecutar con permisos externos, la validacion final fue exitosa.

## Referencia

HU: `code-sena/design-software-docs#209`
