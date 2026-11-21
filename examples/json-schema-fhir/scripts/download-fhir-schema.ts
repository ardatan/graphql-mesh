import { createWriteStream } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';
import unzip, { Entry } from 'unzip-stream';

/** Permanent R4 download (unversioned `/fhir/fhir.schema.json.zip` tracks current / R5). */
const FHIR_R4_SCHEMA_ZIP = 'https://hl7.org/fhir/R4/fhir.schema.json.zip';

async function downloadFhirSchema() {
  const res = await fetch(FHIR_R4_SCHEMA_ZIP);
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  res.body
    .pipe(unzip.Parse())
    .on('entry', (entry: Entry) =>
      entry.pipe(createWriteStream(join(__dirname, `../${entry.path}`))),
    )
    .on('finish', resolve);
  res.body.on('error', reject);
  await promise;
}

downloadFhirSchema().catch(e => {
  console.error(e);
  process.exit(1);
});
