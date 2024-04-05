import { createWriteStream, promises as fsPromises } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { createRouter, Response } from 'fets';

const FILES_DIR = join(__dirname, '../files');

const descriptionByFileName = new Map<string, string>([
  ['example.txt', 'This is an example file description'],
]);

export const router = createRouter()
  .route({
    method: 'POST',
    path: '/upload-file',
    async handler(req) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file) {
        return Response.json(
          {
            message: 'Expected "file"',
          },
          {
            status: 400,
          },
        );
      }
      if (typeof file === 'string') {
        return Response.json(
          {
            message: 'Expected "file" to be a file not a string',
          },
          {
            status: 400,
          },
        );
      }
      const description = formData.get('description');
      if (typeof description !== 'string') {
        return Response.json(
          {
            message: 'Expected "description" to be a string not a file',
          },
          {
            status: 400,
          },
        );
      }
      const writeStream = createWriteStream(join(FILES_DIR, file.name));
      Readable.from(file.stream() as any).pipe(writeStream);
      descriptionByFileName.set(file.name, description);
      return Response.json({
        message: 'File uploaded',
      });
    },
  })
  .route({
    method: 'GET',
    path: '/read-file-as-text/:fileName',
    async handler(req) {
      const fileName = req.params.fileName;
      const filePath = join(FILES_DIR, fileName);
      const description = descriptionByFileName.get(fileName);
      const content = await fsPromises.readFile(filePath, 'utf8');
      return Response.json({
        name: fileName,
        description,
        content,
      });
    },
  });
