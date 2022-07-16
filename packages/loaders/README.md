# Omnigraph

Omnigraph is a set of libraries and tools helps you generate local `GraphQLSchema` instances from different API Schema specifications such as JSON Schema, MySQL, SOAP, OpenAPI and RAML.

You can consume this `GraphQLSchema` inside any tools in GraphQL Ecosystem such as GraphQL Config, GraphQL Code Generator and GraphQL ESLint. You can either bind it to a GraphQL Server like Envelop, Express-GraphQL, GraphQL Helix, Apollo Server or GraphQL Yoga.

### GraphQL Config

GraphQL Config is a way of specifying your GraphQL Project in a standard way so the most of the tools around GraphQL Ecosystem can recognize your project such as VSCode GraphQL Extension, GraphQL ESLint and GraphQL Code Generator

```yaml
schema: ./packages/server/modules/**/*.graphql # Backend
documents: ./packages/client/pages/**/*.graphql # Frontend
```

Omnigraph acts like as a custom loader with GraphQL Config

```yaml
schema:
  MyOmnigraph:
    loader: '@omnigraph/openapi' # This provides GraphQLSchema to GraphQL Config
    source: https://my-openapi-source.com/openapi.yml
    operationHeaders:
      Authorization: Bearer {context.token}
```

### GraphQL Code Generator

Let's say we want to create a type-safe SDK from the generated schema using GraphQL Code Generator and remember GraphQL Code Generator has nothing to do except GraphQL so Omnigraph helps GraphQL Config to consume the nonGraphQL source as GraphQL then it provides the schema and operations to GraphQL Code Generator;

Like any other GraphQL project. We can use `extensions.codegen`

```yaml
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

```ts
// Get GraphQL JIT SDK Factory
import { getSdk } from './sdk'
// Load our schema from bundle
import loadSchemaFromBundle from './load-schema-from-bundle'

export async function getOmnigraphSDK() {
  const schema = await loadSchemaFromBundle()
  // JIT SDK takes local `GraphQLSchema` instance
  return getSdk(schema)
}
```

### Bundling

As you can see above, Omnigraph is able to download sources via HTTP on runtime. But this has some downsides. The remote API might be down or we might have some bandwidth concerns to avoid. So Omnigraph has "Bundling" feature that helps to store the downloaded and resolved resources once ahead-of-time. But this needs some extra code files with programmatic usage by splitting buildtime and runtime configurations;

We can create a script called `generate-bundle.js` and every time we run `npm run generate-bundle` it will download the sources and generate the bundle.

```js
import { createBundle } from '@omnigraph/openapi'
import { writeFileSync } from 'fs'

async function main() {
  const createdBundle = await createBundle('my-omnigraph', {
    // We don't need operation specific configuration like `operationHeaders` here
    // We will use those later
    source: 'https://my-openapi-source.com/openapi.yml',
    schemaHeaders: {
      // Some headers needed to download resources
    }
  })

  // Save it to the disk
  writeFileSync('./bundle.json', JSON.stringify(createdBundle))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
```

Then we can load the schema from another file called `load-schema-from-bundle.js`

```js
import { getGraphQLSchemaFromBundle } from '@omnigraph/openapi'
// Load it as a module so bundlers can recognize and add it to the bundle
import omnigraphBundle from './bundle.json'

export default function loadSchemaFromBundle() {
  return getGraphQLSchemaFromBundle(omnigraphBundle, {
    // Now use the operation specific configuration here
    operationHeaders: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer {context.apiToken}'
    }
  })
}
```

And use our new loader in GraphQL Config by replacing `loader`

```yaml
schema:
  MyOmnigraph:
    loader: ./load-schema-from-bundle.js # This provides GraphQLSchema to GraphQL Config
```

### String interpolation on runtime

You can have dynamic values in `operationHeaders` by using interpolation pattern;
`{context.apiToken}` or `{env.BASE_URL}`
In this case, `context` refers to the context you executed your schema with.
