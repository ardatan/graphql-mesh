const { loadSchema } = require('@graphql-toolkit/core');
const { GraphQLFileLoader } = require('@graphql-toolkit/graphql-file-loader');
const { printSchemaWithDirectives } = require('@graphql-toolkit/common');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

async function main () {
    const schema = await loadSchema('./**/yaml-config.graphql', {
        loaders: [
            new GraphQLFileLoader()
        ],
        assumeValidSDL: true,
    });
    writeFileSync(resolve(__dirname, '../schema.graphql'), printSchemaWithDirectives(schema));
}

main().catch(console.error);
