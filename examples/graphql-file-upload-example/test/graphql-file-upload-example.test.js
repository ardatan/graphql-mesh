const uploadFilesServer = require('../upload-files/server');
const resizeImageServer = require('../resize-image/server');
const { File } = require('cross-undici-fetch')
const { findAndParseConfig } = require('@graphql-mesh/cli');
const { join } = require('path');
const { getMesh } = require('@graphql-mesh/runtime');
const { printSchema, lexicographicSortSchema } = require('graphql');

const mesh$ = findAndParseConfig({
  dir: join(__dirname, '..'),
}).then(config => getMesh(config));

describe('Upload Example', () => {
  let servers = [];
  beforeAll(() => {
    servers.push(
    uploadFilesServer.listen(3001),
    resizeImageServer.listen(3002))
  })
  afterAll(() => {
    servers.forEach(server => server.close())
  });
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      printSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot();
  });
  it('should give correct response', async () => {
    const { execute } = await mesh$;
    const file = new File([Buffer.from('CONTENT')], 'test.txt');
    console.log({
      File,
      file,
      name: file.name
    })
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
  })
});
