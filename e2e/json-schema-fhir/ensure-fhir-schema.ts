import { execFile } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Official HL7 FHIR R4 schema path inside this e2e package (downloaded, not examples/). */
export const fhirSchemaPath = join(__dirname, 'fhir.schema.json');

/** Permanent R4 download (unversioned `/fhir/fhir.schema.json.zip` tracks current / R5). */
const FHIR_R4_SCHEMA_ZIP = 'https://hl7.org/fhir/R4/fhir.schema.json.zip';

/**
 * Stale / wrong-release downloads:
 * - older HL7 zips had `Patient.id` → `#/definitions/string`
 * - unversioned zip is R5-shaped (`Observation.status` → `#/definitions/code`)
 * Current R4 schema: `Patient.id` → `#/definitions/id`, and `Observation.status`
 * is an inline enum (tests the R4 enum path; `scalarMap.id → GraphQLID` needs id).
 */
function schemaLooksLikeFhirR4(path: string): boolean {
  try {
    const doc = JSON.parse(readFileSync(path, 'utf8')) as {
      definitions?: {
        Patient?: { properties?: { id?: { $ref?: string } } };
        Observation?: { properties?: { status?: { enum?: unknown; $ref?: string } } };
      };
    };
    const patientIdRef = doc.definitions?.Patient?.properties?.id?.$ref;
    const status = doc.definitions?.Observation?.properties?.status;
    return (
      patientIdRef === '#/definitions/id' &&
      Array.isArray(status?.enum) &&
      status.enum.length > 0 &&
      status.$ref == null
    );
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
  if (existsSync(fhirSchemaPath) && schemaLooksLikeFhirR4(fhirSchemaPath)) {
    return fhirSchemaPath;
  }
  if (existsSync(fhirSchemaPath)) {
    unlinkSync(fhirSchemaPath);
  }
  const res = await fetch(FHIR_R4_SCHEMA_ZIP);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download FHIR R4 schema: ${res.status} ${res.statusText}`);
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
  if (!schemaLooksLikeFhirR4(fhirSchemaPath)) {
    throw new Error(
      `${fhirSchemaPath} is not FHIR R4 (need Patient.id → #/definitions/id and Observation.status inline enum)`,
    );
  }
  return fhirSchemaPath;
}
