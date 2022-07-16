---
title: 'JSONSchemaLoaderBundleToGraphQLSchemaOptions'
---

# Interface: JSONSchemaLoaderBundleToGraphQLSchemaOptions

[loaders/json-schema/src](../modules/loaders_json_schema_src).JSONSchemaLoaderBundleToGraphQLSchemaOptions

## Table of contents

### Properties

- [baseUrl](loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions#baseurl)
- [cwd](loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions#cwd)
- [fetch](loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions#fetch)
- [logger](loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions#logger)
- [operationHeaders](loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions#operationheaders)
- [pubsub](loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions#pubsub)
- [queryParams](loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions#queryparams)

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:74](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L74)

___

### cwd

• `Optional` **cwd**: `string`

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:70](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L70)

___

### fetch

• `Optional` **fetch**: (`input`: `URL` \| `RequestInfo`, `init?`: `RequestInit`) => `Promise`\<`Response`>

#### Type declaration

▸ (`input`, `init?`): `Promise`\<`Response`>

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `URL` \| `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

`Promise`\<`Response`>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:71](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L71)

___

### logger

• `Optional` **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:73](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L73)

___

### operationHeaders

• `Optional` **operationHeaders**: `Record`\<`string`, `string`>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:75](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L75)

___

### pubsub

• `Optional` **pubsub**: [`MeshPubSub`](types_src.MeshPubSub)

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:72](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L72)

___

### queryParams

• `Optional` **queryParams**: `Record`\<`string`, `string`>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:76](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L76)
