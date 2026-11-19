import { createWriteStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import unzip, { type Entry } from 'unzip-stream';

/** Official HL7 FHIR R4 schema path inside this e2e package (downloaded, not examples/). */
export const fhirSchemaPath = join(__dirname, 'fhir.schema.json');

/**
 * Ensure `fhir.schema.json` exists locally (same zip as examples/json-schema-fhir).
 * Prefer download-in-setup over cross-package relative paths.
 */
export async function ensureFhirSchema(): Promise<string> {
  if (existsSync(fhirSchemaPath)) {
    return fhirSchemaPath;
  }
  const res = await fetch('https://www.hl7.org/fhir/fhir.schema.json.zip');
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download FHIR schema: ${res.status} ${res.statusText}`);
  }
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  Readable.fromWeb(res.body as import('node:stream/web').ReadableStream)
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
  return fhirSchemaPath;
}
