import { createWriteStream, promises as fsPromises } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { createRouter, Response } from '@whatwg-node/router';

export const router = createRouter();

const FILES_DIR = join(__dirname, '../files');

const descriptionByFileName = new Map<string, string>([
  ['example.txt', 'This is an example file description'],
]);

router.post('/upload-file', async req => {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file) {
    return new Response(
      JSON.stringify({
        message: 'Expected "file"',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
  if (typeof file === 'string') {
    return new Response(
      JSON.stringify({
        message: 'Expected "file" to be a file not a string',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
  const description = formData.get('description');
  if (typeof description !== 'string') {
    return new Response(
      JSON.stringify({
        message: 'Expected "description" to be a string not a file',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
  const writeStream = createWriteStream(join(FILES_DIR, file.name));
  Readable.from(file.stream() as any).pipe(writeStream);
  descriptionByFileName.set(file.name, description);
  return new Response(
    JSON.stringify({
      message: 'File uploaded',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
});

router.get('/read-file-as-text/:fileName', async req => {
  const fileName = req.params.fileName;
  const filePath = join(FILES_DIR, fileName);
  const description = descriptionByFileName.get(fileName);
  const content = await fsPromises.readFile(filePath, 'utf8');
  return new Response(
    JSON.stringify({
      name: fileName,
      description,
      content,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
});
