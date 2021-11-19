---
title: 'JSONSchemaLoaderOptions'
---

# Interface: JSONSchemaLoaderOptions

[loaders/json-schema/src](../modules/loaders_json_schema_src).JSONSchemaLoaderOptions

## Hierarchy

- `BaseLoaderOptions`

  ↳ **`JSONSchemaLoaderOptions`**

## Table of contents

### Properties

- [allowLegacySDLEmptyFields](loaders_json_schema_src.JSONSchemaLoaderOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](loaders_json_schema_src.JSONSchemaLoaderOptions#allowlegacysdlimplementsinterfaces)
- [assumeValid](loaders_json_schema_src.JSONSchemaLoaderOptions#assumevalid)
- [assumeValidSDL](loaders_json_schema_src.JSONSchemaLoaderOptions#assumevalidsdl)
- [baseUrl](loaders_json_schema_src.JSONSchemaLoaderOptions#baseurl)
- [commentDescriptions](loaders_json_schema_src.JSONSchemaLoaderOptions#commentdescriptions)
- [cwd](loaders_json_schema_src.JSONSchemaLoaderOptions#cwd)
- [errorMessage](loaders_json_schema_src.JSONSchemaLoaderOptions#errormessage)
- [experimentalFragmentVariables](loaders_json_schema_src.JSONSchemaLoaderOptions#experimentalfragmentvariables)
- [fetch](loaders_json_schema_src.JSONSchemaLoaderOptions#fetch)
- [generateInterfaceFromSharedFields](loaders_json_schema_src.JSONSchemaLoaderOptions#generateinterfacefromsharedfields)
- [ignore](loaders_json_schema_src.JSONSchemaLoaderOptions#ignore)
- [logger](loaders_json_schema_src.JSONSchemaLoaderOptions#logger)
- [noLocation](loaders_json_schema_src.JSONSchemaLoaderOptions#nolocation)
- [operationHeaders](loaders_json_schema_src.JSONSchemaLoaderOptions#operationheaders)
- [operations](loaders_json_schema_src.JSONSchemaLoaderOptions#operations)
- [pubsub](loaders_json_schema_src.JSONSchemaLoaderOptions#pubsub)
- [schemaHeaders](loaders_json_schema_src.JSONSchemaLoaderOptions#schemaheaders)

## Properties

### allowLegacySDLEmptyFields

• `Optional` **allowLegacySDLEmptyFields**: `boolean`

#### Inherited from

BaseLoaderOptions.allowLegacySDLEmptyFields

#### Defined in

node_modules/@graphql-tools/utils/Interfaces.d.ts:18

___

### allowLegacySDLImplementsInterfaces

• `Optional` **allowLegacySDLImplementsInterfaces**: `boolean`

#### Inherited from

BaseLoaderOptions.allowLegacySDLImplementsInterfaces

#### Defined in

node_modules/@graphql-tools/utils/Interfaces.d.ts:19

___

### assumeValid

• `Optional` **assumeValid**: `boolean`

When building a schema from a GraphQL service's introspection result, it
might be safe to assume the schema is valid. Set to true to assume the
produced schema is valid.

Default: false

#### Inherited from

BaseLoaderOptions.assumeValid

#### Defined in

node_modules/graphql/type/schema.d.ts:146

___

### assumeValidSDL

• `Optional` **assumeValidSDL**: `boolean`

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

BaseLoaderOptions.assumeValidSDL

#### Defined in

node_modules/graphql/utilities/buildASTSchema.d.ts:12

___

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L13)

___

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

BaseLoaderOptions.commentDescriptions

#### Defined in

node_modules/@graphql-tools/utils/Interfaces.d.ts:26

___

### cwd

• `Optional` **cwd**: `string`

#### Inherited from

BaseLoaderOptions.cwd

#### Defined in

node_modules/@graphql-tools/utils/loaders.d.ts:10

___

### errorMessage

• `Optional` **errorMessage**: `string`

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L17)

___

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

BaseLoaderOptions.experimentalFragmentVariables

#### Defined in

node_modules/@graphql-tools/utils/Interfaces.d.ts:20

___

### fetch

• `Optional` **fetch**: (`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`<`Response`\>

#### Type declaration

▸ (`input`, `init?`): `Promise`<`Response`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

`Promise`<`Response`\>

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L20)

___

### generateInterfaceFromSharedFields

• `Optional` **generateInterfaceFromSharedFields**: `boolean`

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:21](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L21)

___

### ignore

• `Optional` **ignore**: `string` \| `string`[]

#### Inherited from

BaseLoaderOptions.ignore

#### Defined in

node_modules/@graphql-tools/utils/loaders.d.ts:11

___

### logger

• `Optional` **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L18)

___

### noLocation

• `Optional` **noLocation**: `boolean`

#### Inherited from

BaseLoaderOptions.noLocation

#### Defined in

node_modules/@graphql-tools/utils/Interfaces.d.ts:17

___

### operationHeaders

• `Optional` **operationHeaders**: `Record`<`string`, `string`\>

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L14)

___

### operations

• **operations**: [`JSONSchemaOperationConfig`](../modules/loaders_json_schema_src#jsonschemaoperationconfig)[]

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L16)

___

### pubsub

• `Optional` **pubsub**: [`MeshPubSub`](types_src.MeshPubSub)

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L19)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Record`<`string`, `string`\>

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L15)
