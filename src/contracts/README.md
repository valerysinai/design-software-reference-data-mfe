# contracts — reference-data

Tipos de API **generados**, nunca escritos a mano (ADR-009 seccion 5).

- Origen del contrato: `design-software-shared-contracts/openapi/reference-data.yaml`.
  Hoy ese archivo vive en `design-software-docs/07-api/contracts/openapi/reference-data.yaml` y debe
  publicarse en `shared-contracts/openapi/` para que la generacion sea reproducible.
- Destino de los tipos generados: este directorio.
- Regeneración desde la raíz de este MFE: `npm run generate:types`.
  El script usa `openapi-typescript` y acepta `REFERENCE_DATA_CONTRACT` para
  apuntar al artefacto versionado aprobado. En este workspace usa como fallback
  `../design-software-docs/07-api/contracts/openapi/reference-data.yaml`.
  No editar `reference-data.generated.ts` manualmente; cualquier cambio debe hacerse
  en el contrato y luego regenerarse.
- `remote-props.ts` es un **placeholder local** de la forma expuesta del remote. La version
  autoritativa es `design-software-frontend-platform/src/contracts/remote-props.ts`
  (ADR-009 seccion 11); cuando ese paquete se publique, `src/App.tsx` debe pasar a implementar
  esa interfaz y este archivo debe eliminarse.
