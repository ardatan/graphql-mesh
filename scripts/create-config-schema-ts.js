const { readFileSync, writeFileSync } = require('fs-extra');

const { join } = require('path');

const absoluteConfigSchemaPath = join(__dirname, '../packages/legacy/types/src/config-schema.json');
const absoluteConfigSchemaTsPath = join(__dirname, '../packages/legacy/types/src/config-schema.ts');

const configSchemaStr = readFileSync(absoluteConfigSchemaPath, 'utf-8');
const configSchemaTs = `export const jsonSchema: any = ${configSchemaStr} as any;`;

writeFileSync(absoluteConfigSchemaTsPath, configSchemaTs);
