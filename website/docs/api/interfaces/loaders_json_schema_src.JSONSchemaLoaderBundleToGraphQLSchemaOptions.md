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

## Properties

### baseUrl

• `Optional` **baseUrl**: `string`

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:68](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L68)

___

### cwd

• `Optional` **cwd**: `string`

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:64](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L64)

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

[packages/loaders/json-schema/src/bundle.ts:65](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L65)

___

### logger

• `Optional` **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:67](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L67)

___

### operationHeaders

• `Optional` **operationHeaders**: `Record`<`string`, `string`\>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L69)

___

### pubsub

• `Optional` **pubsub**: [`MeshPubSub`](types_src.MeshPubSub)

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:66](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L66)
