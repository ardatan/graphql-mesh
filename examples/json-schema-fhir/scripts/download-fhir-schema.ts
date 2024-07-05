import { createWriteStream } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import unzip, { Entry } from 'unzip-stream';
import { fetch } from '@whatwg-node/fetch';

async function downloadFhirSchema() {
  const res = await fetch('https://www.hl7.org/fhir/fhir.schema.json.zip');
  await new Promise((resolve, reject) => {
    if (!res.body) {
      reject(new Error('No body'));
      return;
    }
    const stream = res.body as unknown as Readable;
    stream
      .pipe(unzip.Parse())
      .on('entry', (entry: Entry) =>
        entry.pipe(createWriteStream(join(__dirname, `../${entry.path}`))),
      )
      .on('finish', resolve);
    stream.on('error', reject);
  });
}

downloadFhirSchema().catch(e => {
  console.error(e);
  process.exit(1);
});
