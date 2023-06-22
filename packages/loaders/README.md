# Omnigraph

Omnigraph is a set of libraries and tools helps you generate local `GraphQLSchema` instances from
different API Schema specifications such as JSON Schema, MySQL, SOAP, OpenAPI and RAML.

You can consume this `GraphQLSchema` inside any tools in GraphQL Ecosystem such as GraphQL Config,
GraphQL Code Generator and GraphQL ESLint. You can either bind it to a GraphQL Server like Envelop,
Express-GraphQL, GraphQL Helix, Apollo Server or GraphQL Yoga.

### GraphQL Config

GraphQL Config is a way of specifying your GraphQL Project in a standard way so the most of the
tools around GraphQL Ecosystem can recognize your project such as VSCode GraphQL Extension, GraphQL
ESLint and GraphQL Code Generator

```yaml filename=".graphqlrc.yml"
schema: ./packages/server/modules/**/*.graphql # Backend
documents: ./packages/client/pages/**/*.graphql # Frontend
```

Omnigraph acts like as a custom loader with GraphQL Config

```yaml filename=".graphqlrc.yml"
schema:
  MyOmnigraph:
    loader: '@omnigraph/openapi' # This provides GraphQLSchema to GraphQL Config
    source: https://my-openapi-source.com/openapi.yml
    operationHeaders:
      Authorization: Bearer {context.token}
```

### GraphQL Code Generator

Let's say we want to create a type-safe SDK from the generated schema using GraphQL Code Generator
and remember GraphQL Code Generator has nothing to do except GraphQL so Omnigraph helps GraphQL
Config to consume the nonGraphQL source as GraphQL then it provides the schema and operations to
GraphQL Code Generator;

Like any other GraphQL project. We can use `extensions.codegen`

```yaml filename=".graphqlrc.yml"
schema:
  MyOmnigraph:
    loader: '@omnigraph/openapi' # This provides GraphQLSchema to GraphQL Config
    source: https://my-openapi-source.com/openapi.yml
documents: ./src/modules/my-sdk/operations/*.graphql
extensions:
  codegen:
    generates:
      ./src/modules/my-sdk/schema.graphql:
        # This plugin outputs the generated schema as a human-readable SDL format
        - schema-ast
      ./src/modules/my-sdk/sdk.ts:
        # This plugin creates an SDK for each operation found in `documents`
        - typescript-jit-sdk
```

#### Example: GraphQL JIT SDK Usage with Omnigraph Bundle

```ts filename="get-omnigraph-sdk.ts"
// Get GraphQL JIT SDK Factory
// Load our schema from bundle
import loadSchemaFromBundle from './load-schema-from-bundle'
import { getSdk } from './sdk'

export async function getOmnigraphSDK() {
  const schema = await loadSchemaFromBundle()
  // JIT SDK takes local `GraphQLSchema` instance
  return getSdk(schema)
}
```

### String interpolation on runtime

You can have dynamic values in `operationHeaders` by using interpolation pattern;
`{context.apiToken}` or `{env.BASE_URL}` In this case, `context` refers to the context you executed
your schema with.
