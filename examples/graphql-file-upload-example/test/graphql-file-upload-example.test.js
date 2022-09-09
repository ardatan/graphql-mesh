const uploadFilesServer = require('../upload-files/server');
const resizeImageServer = require('../resize-image/server');
const { File } = require('@whatwg-node/fetch');
const { findAndParseConfig } = require('@graphql-mesh/cli');
const { join } = require('path');
const { getMesh } = require('@graphql-mesh/runtime');

const mesh$ = findAndParseConfig({
  dir: join(__dirname, '..'),
}).then(config => getMesh(config));

describe('Upload Example', () => {
  beforeAll(() => Promise.all([uploadFilesServer.start(), resizeImageServer.start()]));
  afterAll(() => Promise.all([uploadFilesServer.stop(), resizeImageServer.stop(), mesh$.then(mesh => mesh.destroy())]));
  it('should give correct response', async () => {
    const { execute } = await mesh$;
    const file = new File(['CONTENT'], 'test.txt');
    const result = await execute(
      /* GraphQL */ `
        mutation UploadFile($upload: File!) {
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
