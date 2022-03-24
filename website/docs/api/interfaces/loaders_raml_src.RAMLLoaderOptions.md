---
title: 'RAMLLoaderOptions'
---

# Interface: RAMLLoaderOptions

[loaders/raml/src](../modules/loaders_raml_src).RAMLLoaderOptions

## Hierarchy

- `Partial`<[`JSONSchemaLoaderOptions`](loaders_json_schema_src.JSONSchemaLoaderOptions)\>

  ↳ **`RAMLLoaderOptions`**

## Table of contents

### Properties

- [allowLegacySDLEmptyFields](loaders_raml_src.RAMLLoaderOptions#allowlegacysdlemptyfields)
- [allowLegacySDLImplementsInterfaces](loaders_raml_src.RAMLLoaderOptions#allowlegacysdlimplementsinterfaces)
- [assumeValid](loaders_raml_src.RAMLLoaderOptions#assumevalid)
- [assumeValidSDL](loaders_raml_src.RAMLLoaderOptions#assumevalidsdl)
- [baseUrl](loaders_raml_src.RAMLLoaderOptions#baseurl)
- [commentDescriptions](loaders_raml_src.RAMLLoaderOptions#commentdescriptions)
- [cwd](loaders_raml_src.RAMLLoaderOptions#cwd)
- [errorMessage](loaders_raml_src.RAMLLoaderOptions#errormessage)
- [experimentalFragmentVariables](loaders_raml_src.RAMLLoaderOptions#experimentalfragmentvariables)
- [fetch](loaders_raml_src.RAMLLoaderOptions#fetch)
- [generateInterfaceFromSharedFields](loaders_raml_src.RAMLLoaderOptions#generateinterfacefromsharedfields)
- [ignore](loaders_raml_src.RAMLLoaderOptions#ignore)
- [ignoreErrorResponses](loaders_raml_src.RAMLLoaderOptions#ignoreerrorresponses)
- [logger](loaders_raml_src.RAMLLoaderOptions#logger)
- [noLocation](loaders_raml_src.RAMLLoaderOptions#nolocation)
- [operationHeaders](loaders_raml_src.RAMLLoaderOptions#operationheaders)
- [operations](loaders_raml_src.RAMLLoaderOptions#operations)
- [pubsub](loaders_raml_src.RAMLLoaderOptions#pubsub)
- [ramlFilePath](loaders_raml_src.RAMLLoaderOptions#ramlfilepath)
- [schemaHeaders](loaders_raml_src.RAMLLoaderOptions#schemaheaders)
- [selectQueryOrMutationField](loaders_raml_src.RAMLLoaderOptions#selectqueryormutationfield)

## Properties

### allowLegacySDLEmptyFields

• `Optional` **allowLegacySDLEmptyFields**: `boolean`

#### Inherited from

Partial.allowLegacySDLEmptyFields

#### Defined in

node_modules/@graphql-tools/utils/Interfaces.d.ts:18

___

### allowLegacySDLImplementsInterfaces

• `Optional` **allowLegacySDLImplementsInterfaces**: `boolean`

#### Inherited from

Partial.allowLegacySDLImplementsInterfaces

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

Partial.assumeValid

#### Defined in

node_modules/graphql/type/schema.d.ts:146

___

### assumeValidSDL

• `Optional` **assumeValidSDL**: `boolean`

Set to true to assume the SDL is valid.

Default: false

#### Inherited from

Partial.assumeValidSDL

#### Defined in

node_modules/graphql/utilities/buildASTSchema.d.ts:12

___

### baseUrl

• `Optional` **baseUrl**: `string`

#### Inherited from

Partial.baseUrl

#### Defined in

[packages/loaders/json-schema/src/types.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L7)

___

### commentDescriptions

• `Optional` **commentDescriptions**: `boolean`

Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
parsing. Turning the flag on will support the other way as well (`parse`)

#### Inherited from

Partial.commentDescriptions

#### Defined in

node_modules/@graphql-tools/utils/Interfaces.d.ts:26

___

### cwd

• `Optional` **cwd**: `string`

#### Inherited from

Partial.cwd

#### Defined in

node_modules/@graphql-tools/utils/loaders.d.ts:10

___

### errorMessage

• `Optional` **errorMessage**: `string`

#### Inherited from

Partial.errorMessage

#### Defined in

[packages/loaders/json-schema/src/types.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L11)

___

### experimentalFragmentVariables

• `Optional` **experimentalFragmentVariables**: `boolean`

#### Inherited from

Partial.experimentalFragmentVariables

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

#### Inherited from

Partial.fetch

#### Defined in

[packages/loaders/json-schema/src/types.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L14)

___

### generateInterfaceFromSharedFields

• `Optional` **generateInterfaceFromSharedFields**: `boolean`

#### Inherited from

Partial.generateInterfaceFromSharedFields

#### Defined in

[packages/loaders/json-schema/src/types.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L15)

___

### ignore

• `Optional` **ignore**: `string` \| `string`[]

#### Inherited from

Partial.ignore

#### Defined in

node_modules/@graphql-tools/utils/loaders.d.ts:11

___

### ignoreErrorResponses

• `Optional` **ignoreErrorResponses**: `boolean`

#### Inherited from

Partial.ignoreErrorResponses

#### Defined in

[packages/loaders/json-schema/src/types.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L16)

___

### logger

• `Optional` **logger**: [`Logger`](../modules/types_src#logger)

#### Inherited from

Partial.logger

#### Defined in

[packages/loaders/json-schema/src/types.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L12)

___

### noLocation

• `Optional` **noLocation**: `boolean`

#### Inherited from

Partial.noLocation

#### Defined in

node_modules/@graphql-tools/utils/Interfaces.d.ts:17

___

### operationHeaders

• `Optional` **operationHeaders**: `Record`<`string`, `string`\>

#### Inherited from

Partial.operationHeaders

#### Defined in

[packages/loaders/json-schema/src/types.ts:8](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L8)

___

### operations

• `Optional` **operations**: [`JSONSchemaOperationConfig`](../modules/loaders_json_schema_src#jsonschemaoperationconfig)[]

#### Inherited from

Partial.operations

#### Defined in

[packages/loaders/json-schema/src/types.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L10)

___

### pubsub

• `Optional` **pubsub**: [`MeshPubSub`](types_src.MeshPubSub)

#### Inherited from

Partial.pubsub

#### Defined in

[packages/loaders/json-schema/src/types.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L13)

___

### ramlFilePath

• **ramlFilePath**: `string`

#### Defined in

[packages/loaders/raml/src/types.ts:4](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/raml/src/types.ts#L4)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Record`<`string`, `string`\>

#### Inherited from

Partial.schemaHeaders

#### Defined in

[packages/loaders/json-schema/src/types.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L9)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: `RAMLLoaderSelectQueryOrMutationFieldConfig`[]

#### Defined in

[packages/loaders/raml/src/types.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/raml/src/types.ts#L5)
