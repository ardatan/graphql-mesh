import { execFile } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Official HL7 FHIR R4 schema path inside this e2e package (downloaded, not examples/). */
export const fhirSchemaPath = join(__dirname, 'fhir.schema.json');

/**
 * Stale downloads (older HL7 zips) had `Patient.id` → `#/definitions/string`.
 * Current R4 schema refs `#/definitions/id`, which `scalarMap.id → GraphQLID` needs.
 */
function schemaHasIdDefinitionRef(path: string): boolean {
  try {
    const doc = JSON.parse(readFileSync(path, 'utf8')) as {
      definitions?: { Patient?: { properties?: { id?: { $ref?: string } } } };
    };
    return doc.definitions?.Patient?.properties?.id?.$ref === '#/definitions/id';
  } catch {
    return false;
  }
}

/**
 * Ensure `fhir.schema.json` exists locally (same zip as examples/json-schema-fhir).
 * Prefer download-in-setup over cross-package relative paths.
 *
 * Uses system `unzip` (not `unzip-stream`): Node 26 CI workers SIGSEGV'd while
 * piping the HL7 zip through unzip-stream in the Jest worker.
 */
export async function ensureFhirSchema(): Promise<string> {
  if (existsSync(fhirSchemaPath) && schemaHasIdDefinitionRef(fhirSchemaPath)) {
    return fhirSchemaPath;
  }
  if (existsSync(fhirSchemaPath)) {
    unlinkSync(fhirSchemaPath);
  }
  const res = await fetch('https://www.hl7.org/fhir/fhir.schema.json.zip');
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download FHIR schema: ${res.status} ${res.statusText}`);
  }
  const zipPath = join(tmpdir(), `fhir.schema.json.${process.pid}.${Date.now()}.zip`);
  try {
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
    // `-j` junk paths; `-o` overwrite; extract only the schema file into this dir.
    await execFileAsync('unzip', ['-o', '-j', zipPath, 'fhir.schema.json', '-d', __dirname], {
      maxBuffer: 16 * 1024 * 1024,
    });
  } finally {
    if (existsSync(zipPath)) {
      unlinkSync(zipPath);
    }
  }
  if (!existsSync(fhirSchemaPath)) {
    throw new Error(`Download finished but ${fhirSchemaPath} is missing`);
  }
  if (!schemaHasIdDefinitionRef(fhirSchemaPath)) {
    throw new Error(
      `${fhirSchemaPath} missing Patient.id → #/definitions/id (unexpected HL7 schema shape)`,
    );
  }
  return fhirSchemaPath;
}
