import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { File } from '@whatwg-node/fetch';
import { router } from '../src/router';

describe('JSON Schema File Uploads', () => {
  let mesh: MeshInstance;
  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh({
      ...config,
      fetchFn: router.fetch as any,
    });
  });
  afterAll(() => {
    mesh.destroy();
  });
  it('should upload files correctly', async () => {
    const uploadResult = await mesh.execute(
      /* GraphQL */ `
        mutation UploadFile($file: File!, $description: String!) {
          uploadFile(input: { file: $file, description: $description }) {
            message
          }
        }
      `,
      {
        file: new File(['This is a test file'], 'test.txt', {
          type: 'text/plain',
        }),
        description: 'This is a test file description',
      },
    );
    expect(uploadResult).toMatchObject({
      data: {
        uploadFile: {
          message: 'File uploaded',
        },
      },
    });
  });
  it('should read files correctly', async () => {
    const readResult = await mesh.execute(
      /* GraphQL */ `
        query ReadFile($fileName: String!) {
          readFileAsText(fileName: $fileName) {
            name
            description
            content
          }
        }
      `,
      {
        fileName: 'example.txt',
      },
    );
    expect(readResult).toMatchObject({
      data: {
        readFileAsText: {
          name: 'example.txt',
          description: 'This is an example file description',
          content: 'This is an example file\n',
        },
      },
    });
  });
});
