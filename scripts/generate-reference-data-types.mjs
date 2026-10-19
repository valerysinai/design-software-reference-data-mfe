/* global URL, process, console */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const configuredContract = process.env.REFERENCE_DATA_CONTRACT;
const localContract = resolve(root, "../design-software-docs/07-api/contracts/openapi/reference-data.yaml");
const contract = configuredContract ? resolve(configuredContract) : localContract;
const output = resolve(root, "src/contracts/reference-data.generated.ts");

if (!existsSync(contract)) {
  console.error(`No se encontró el contrato OpenAPI: ${contract}`);
  console.error("Configure REFERENCE_DATA_CONTRACT con la ruta del artefacto versionado aprobado.");
  process.exit(1);
}

const command = process.execPath;
const cli = resolve(root, "node_modules/openapi-typescript/bin/cli.js");
const result = spawnSync(command, [cli, contract, "-o", output], { cwd: root, stdio: "inherit" });
process.exit(result.status ?? 1);
