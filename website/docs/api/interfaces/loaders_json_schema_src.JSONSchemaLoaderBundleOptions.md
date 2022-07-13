---
title: 'JSONSchemaLoaderBundleOptions'
---

# Interface: JSONSchemaLoaderBundleOptions

[loaders/json-schema/src](../modules/loaders_json_schema_src).JSONSchemaLoaderBundleOptions

## Table of contents

### Properties

- [baseUrl](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#baseurl)
- [cwd](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#cwd)
- [fetch](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#fetch)
- [ignoreErrorResponses](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#ignoreerrorresponses)
- [logger](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#logger)
- [noDeduplication](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#nodeduplication)
- [operationHeaders](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#operationheaders)
- [operations](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#operations)
- [schemaHeaders](loaders_json_schema_src.JSONSchemaLoaderBundleOptions#schemaheaders)

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L20)

___

### cwd

• `Optional` **cwd**: `string`

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:24](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L24)

___

### fetch

• `Optional` **fetch**: (`input`: `URL` \| `RequestInfo`, `init?`: `RequestInit`) => `Promise`<`Response`\>

#### Type declaration

▸ (`input`, `init?`): `Promise`<`Response`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `URL` \| `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

`Promise`<`Response`\>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:28](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L28)

___

### ignoreErrorResponses

• `Optional` **ignoreErrorResponses**: `boolean`

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:25](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L25)

___

### logger

• `Optional` **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:29](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L29)

___

### noDeduplication

• `Optional` **noDeduplication**: `boolean`

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:26](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L26)

___

### operationHeaders

• `Optional` **operationHeaders**: `Record`<`string`, `string`\>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:23](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L23)

___

### operations

• **operations**: [`JSONSchemaOperationConfig`](../modules/loaders_json_schema_src#jsonschemaoperationconfig)[]

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:21](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L21)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Record`<`string`, `string`\>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:22](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L22)
