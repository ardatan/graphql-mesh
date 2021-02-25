const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { readFileSync } = require('fs');
const { join } = require('path');

describe('JSON Schema Example', () => {
    it('should generate correct schema', async () => {
        const config = await findAndParseConfig({
            dir: join(__dirname, '..')
        });
        const mesh = await getMesh(config);
        expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot();
    });
    it('should give correct response', async () => {
        const config = await findAndParseConfig({
          dir: join(__dirname, '..'),
        });
        const mesh = await getMesh(config);
        const query = readFileSync(join(__dirname, '../example-query.graphql'));
        const result = await mesh.execute(query);
        expect(result).toMatchSnapshot();
    });
});
