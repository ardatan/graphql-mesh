import { createTenv } from '../tenv';

const { compose, fs } = createTenv(__dirname);

it('should write compose output to fusiongraph.graphql', async () => {
  const target = 'fusiongraph.graphql';
  const proc = await compose(target);
  await proc.waitForExit;

  await expect(fs.read(target)).resolves.toMatchInlineSnapshot(`
"schema {
  query: Query
}

type Query {
  hello: String @resolver(subgraph: "test", operation: "query hello { hello }") @source(subgraph: "test", name: "hello", type: "String")
}"
`);

  await fs.delete(target);
});

it('should write compose output to fusiongraph.json', async () => {
  const target = 'fusiongraph.json';
  const proc = await compose(target);
  await proc.waitForExit;

  await expect(fs.read(target)).resolves.toMatchInlineSnapshot(`
"{
  "kind": "Document",
  "definitions": [
    {
      "kind": "SchemaDefinition",
      "directives": [],
      "operationTypes": [
        {
          "kind": "OperationTypeDefinition",
          "operation": "query",
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Query"
            }
          }
        }
      ]
    },
    {
      "kind": "ObjectTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Query"
      },
      "interfaces": [],
      "directives": [],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": {
            "kind": "Name",
            "value": "hello"
          },
          "arguments": [],
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "String"
            }
          },
          "directives": [
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "resolver"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "subgraph"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "test",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "operation"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "query hello { hello }",
                    "block": false
                  }
                }
              ]
            },
            {
              "kind": "Directive",
              "name": {
                "kind": "Name",
                "value": "source"
              },
              "arguments": [
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "subgraph"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "test",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "name"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "hello",
                    "block": false
                  }
                },
                {
                  "kind": "Argument",
                  "name": {
                    "kind": "Name",
                    "value": "type"
                  },
                  "value": {
                    "kind": "StringValue",
                    "value": "String",
                    "block": false
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}"
`);

  await fs.delete(target);
});

it('should write compose output to fusiongraph.js', async () => {
  const target = 'fusiongraph.js';
  const proc = await compose(target);
  await proc.waitForExit;

  await expect(fs.read(target)).resolves.toMatchInlineSnapshot(`"export default "schema {\\n  query: Query\\n}\\n\\ntype Query {\\n  hello: String @resolver(subgraph: \\"test\\", operation: \\"query hello { hello }\\") @source(subgraph: \\"test\\", name: \\"hello\\", type: \\"String\\")\\n}""`);

  await fs.delete(target);
});

it('should write compose output to fusiongraph.ts', async () => {
  const target = 'fusiongraph.ts';
  const proc = await compose(target);
  await proc.waitForExit;

  await expect(fs.read(target)).resolves.toMatchInlineSnapshot(`"export default "schema {\\n  query: Query\\n}\\n\\ntype Query {\\n  hello: String @resolver(subgraph: \\"test\\", operation: \\"query hello { hello }\\") @source(subgraph: \\"test\\", name: \\"hello\\", type: \\"String\\")\\n}""`);

  await fs.delete(target);
});
