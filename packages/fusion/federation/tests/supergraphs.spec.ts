/* eslint-disable import/no-nodejs-modules */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { convertSupergraphToFusiongraph } from '../src/index';

describe('Supergraphs', () => {
  readdirSync(join(__dirname, 'fixtures', 'supergraphs')).forEach(file => {
    it(file, async () => {
      const supergraphSdl = readFileSync(join(__dirname, 'fixtures', 'supergraphs', file), 'utf-8');
      const fusiongraph = convertSupergraphToFusiongraph(supergraphSdl);
      expect(file).toMatchSnapshot(printSchemaWithDirectives(fusiongraph));
    });
  });
});
