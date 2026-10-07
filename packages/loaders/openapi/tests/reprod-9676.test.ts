import { assertObjectType, isNonNullType, printSchema } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('Reproduction #9676', () => {
  it('maps a Swagger 2 body parameter to input and does not add body: JSON!', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('Repro', {
      endpoint: 'http://localhost',
      source: './fixtures/reprod-9676.yml',
      cwd: __dirname,
    });

    const mutation = assertObjectType(schema.getMutationType());
    const printed = printSchema(schema);

    const updateItem = mutation.getFields().updateItem;
    expect(updateItem.args.map(arg => arg.name)).toEqual(['id', 'input']);
    expect(isNonNullType(updateItem.args.find(arg => arg.name === 'id')!.type)).toBe(true);
    expect(isNonNullType(updateItem.args.find(arg => arg.name === 'input')!.type)).toBe(true);
    expect(printed).toContain(
      'updateItem(id: Int!, input: updateItem_request_Input!): updateItem_200_response',
    );
    expect(printed).not.toContain('body: JSON');

    const updateItemOptional = mutation.getFields().updateItemOptional;
    expect(updateItemOptional.args.map(arg => arg.name)).toEqual(['id', 'input']);
    expect(isNonNullType(updateItemOptional.args.find(arg => arg.name === 'id')!.type)).toBe(true);
    expect(isNonNullType(updateItemOptional.args.find(arg => arg.name === 'input')!.type)).toBe(
      false,
    );
    expect(printed).not.toContain('payload:');

    const createItem = mutation.getFields().createItem;
    expect(createItem.args.map(arg => arg.name)).toEqual(['input']);
    expect(isNonNullType(createItem.args[0].type)).toBe(true);
    expect(printed).toContain(
      'createItem(input: createItem_request_Input!): createItem_200_response',
    );
  });

  it('does not add a body argument for an OpenAPI 3 requestBody', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('Repro', {
      endpoint: 'http://localhost',
      source: './fixtures/reprod-9676-oas3.yml',
      cwd: __dirname,
    });

    const mutation = assertObjectType(schema.getMutationType());
    const updateItem = mutation.getFields().updateItem;
    expect(updateItem.args.map(arg => arg.name)).toEqual(['id', 'input']);
    expect(printSchema(schema)).not.toContain('body: JSON');
  });
});
