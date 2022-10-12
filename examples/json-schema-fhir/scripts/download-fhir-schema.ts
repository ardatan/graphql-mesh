import fetch from 'node-fetch';
import { createWriteStream } from 'fs';
import { join } from 'path';
import unzip, { Entry } from 'unzip-stream';

async function downloadFhirSchema() {
  const res = await fetch('https://www.hl7.org/fhir/fhir.schema.json.zip');
  await new Promise((resolve, reject) => {
    res.body
      .pipe(unzip.Parse())
      .on('entry', (entry: Entry) => entry.pipe(createWriteStream(join(__dirname, `../${entry.path}`))))
      .on('finish', resolve);
    res.body.on('error', reject);
  });
}

downloadFhirSchema().catch(e => {
  console.error(e);
  process.exit(1);
});
