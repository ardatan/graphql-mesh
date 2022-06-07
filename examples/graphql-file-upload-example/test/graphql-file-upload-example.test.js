const uploadFilesServer = require('../upload-files/server');
const resizeImageServer = require('../resize-image/server');
const { File } = require('cross-undici-fetch');
const { findAndParseConfig } = require('@graphql-mesh/cli');
const { join } = require('path');
const { getMesh } = require('@graphql-mesh/runtime');

const mesh$ = findAndParseConfig({
  dir: join(__dirname, '..'),
}).then(config => getMesh(config));

describe('Upload Example', () => {
  beforeAll(async () => {
    await uploadFilesServer.start();
    await resizeImageServer.start();
  });
  afterAll(async () => {
    await uploadFilesServer.stop();
    await resizeImageServer.stop();
    const mesh = await mesh$;
    mesh.destroy();
  });
  it('should give correct response', async () => {
    const { execute } = await mesh$;
    const file = new File([Buffer.from('CONTENT')], 'test.txt');
    const result = await execute(
      /* GraphQL */ `
        mutation UploadFile($upload: Upload!) {
          uploadFile(upload: $upload) {
            filename
          }
        }
      `,
      {
        upload: file,
      }
    );
    expect(result?.data?.uploadFile?.filename).toBe('test.txt');
  });
});
