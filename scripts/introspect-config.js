const { loadSchema } = require('@graphql-toolkit/core');
const { GraphQLFileLoader } = require('@graphql-toolkit/graphql-file-loader');
const { printSchemaWithDirectives } = require('@graphql-toolkit/common');
const { writeFileSync } = require('fs');
const { resolve } = require('path');
const { DIRECTIVES } = require('graphql-to-config-schema');

async function main () {
    const schema = await loadSchema([DIRECTIVES, './**/yaml-config.graphql'], {
        loaders: [
            new GraphQLFileLoader()
        ],
        assumeValidSDL: true,
    });
    writeFileSync(resolve(__dirname, '../schema.graphql'), printSchemaWithDirectives(schema));
}

main().catch(console.error);
