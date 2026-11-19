import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

jest.setTimeout(120_000);

describe('FHIR', () => {
  let mesh: MeshInstance;
  beforeAll(async () => {
    process.env.FHIR_BASE ||= 'https://hapi.fhir.org/baseR4';
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  afterAll(() => {
    return mesh?.destroy();
  });

  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot();
  });

  it('ops emit @connect by default; Reference.resource stays Mesh @resolveTo', () => {
    // v0 jsonSchema handler stamps `@connect` for operations — no hand `@connect`
    // in .meshrc. Follow-up fetch remains `@resolveTo` (legacy Mesh stitching).
    const sdl = printSchemaWithDirectives(mesh.schema);
    expect(sdl).toMatch(/resourceById\([^)]*\): ResourceList @connect\(/);
    expect(sdl).toMatch(
      /resource: ResourceList @resolveTo\(sourceName: "FHIR"[^)]*sourceFieldName: "resourceById"/,
    );
    expect(sdl).not.toMatch(/resource: ResourceList @connect\(/);
  });
});
