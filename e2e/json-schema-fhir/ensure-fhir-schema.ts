import { createWriteStream, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import unzip, { type Entry } from 'unzip-stream';

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
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  Readable.fromWeb(res.body as NodeWebReadableStream)
    .pipe(unzip.Parse())
    .on('entry', (entry: Entry) => {
      entry.pipe(createWriteStream(join(__dirname, entry.path)));
    })
    .on('finish', () => resolve())
    .on('error', reject);
  await promise;
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
