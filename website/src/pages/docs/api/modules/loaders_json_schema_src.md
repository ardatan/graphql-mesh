---
id: "@omnigraph_json-schema"
title: "@omnigraph/json-schema"
---

## Table of contents

### References

- [default](loaders_json_schema_src#default)

### Interfaces

- [JSONSchemaLinkConfig](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLinkConfig)
- [JSONSchemaLoaderBundle](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)
- [JSONSchemaLoaderBundleOptions](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundleOptions)
- [JSONSchemaLoaderBundleToGraphQLSchemaOptions](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions)
- [JSONSchemaLoaderOptions](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderOptions)
- [JSONSchemaOperationResponseConfig](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaOperationResponseConfig)

### Type aliases

- [HTTPMethod](loaders_json_schema_src#httpmethod)
- [JSONSchemaBaseOperationConfig](loaders_json_schema_src#jsonschemabaseoperationconfig)
- [JSONSchemaBaseOperationConfigWithJSONRequest](loaders_json_schema_src#jsonschemabaseoperationconfigwithjsonrequest)
- [JSONSchemaHTTPBaseOperationConfig](loaders_json_schema_src#jsonschemahttpbaseoperationconfig)
- [JSONSchemaHTTPBinaryConfig](loaders_json_schema_src#jsonschemahttpbinaryconfig)
- [JSONSchemaHTTPJSONOperationConfig](loaders_json_schema_src#jsonschemahttpjsonoperationconfig)
- [JSONSchemaOperationConfig](loaders_json_schema_src#jsonschemaoperationconfig)
- [JSONSchemaPubSubOperationConfig](loaders_json_schema_src#jsonschemapubsuboperationconfig)

### Variables

- [anySchema](loaders_json_schema_src#anyschema)

### Functions

- [createBundle](loaders_json_schema_src#createbundle)
- [getComposerFromJSONSchema](loaders_json_schema_src#getcomposerfromjsonschema)
- [getDereferencedJSONSchemaFromOperations](loaders_json_schema_src#getdereferencedjsonschemafromoperations)
- [getGraphQLSchemaFromBundle](loaders_json_schema_src#getgraphqlschemafrombundle)
- [getGraphQLSchemaFromDereferencedJSONSchema](loaders_json_schema_src#getgraphqlschemafromdereferencedjsonschema)
- [getReferencedJSONSchemaFromOperations](loaders_json_schema_src#getreferencedjsonschemafromoperations)
- [loadGraphQLSchemaFromJSONSchemas](loaders_json_schema_src#loadgraphqlschemafromjsonschemas)

## References

### default

Renames and re-exports [loadGraphQLSchemaFromJSONSchemas](loaders_json_schema_src#loadgraphqlschemafromjsonschemas)

## Type aliases

### HTTPMethod

Ƭ **HTTPMethod**: ``"GET"`` \| ``"HEAD"`` \| ``"POST"`` \| ``"PUT"`` \| ``"DELETE"`` \| ``"CONNECT"`` \| ``"OPTIONS"`` \| ``"TRACE"`` \| ``"PATCH"``

#### Defined in

[packages/loaders/json-schema/src/types.ts:57](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L57)

___

### JSONSchemaBaseOperationConfig

Ƭ **JSONSchemaBaseOperationConfig**: \{ `argTypeMap?`: `Record`\<`string`, `string` \| `GraphQLInputType`> ; `description?`: `string` ; `field`: `string` ; `type`: `OperationTypeNode`  } & \{ `responseByStatusCode?`: `Record`\<`string`, [`JSONSchemaOperationResponseConfig`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaOperationResponseConfig)>  } \| [`JSONSchemaOperationResponseConfig`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaOperationResponseConfig)

#### Defined in

[packages/loaders/json-schema/src/types.ts:37](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L37)

___

### JSONSchemaBaseOperationConfigWithJSONRequest

Ƭ **JSONSchemaBaseOperationConfigWithJSONRequest**: [`JSONSchemaBaseOperationConfig`](loaders_json_schema_src#jsonschemabaseoperationconfig) & \{ `requestBaseBody?`: `any` ; `requestSample?`: `any` ; `requestSchema?`: `string` \| [`JSONSchema`](json_machete_src#jsonschema) ; `requestTypeName?`: `string`  }

#### Defined in

[packages/loaders/json-schema/src/types.ts:50](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L50)

___

### JSONSchemaHTTPBaseOperationConfig

Ƭ **JSONSchemaHTTPBaseOperationConfig**: [`JSONSchemaBaseOperationConfig`](loaders_json_schema_src#jsonschemabaseoperationconfig) & \{ `headers?`: `Record`\<`string`, `string`> ; `method?`: [`HTTPMethod`](loaders_json_schema_src#httpmethod) ; `path`: `string`  }

#### Defined in

[packages/loaders/json-schema/src/types.ts:59](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L59)

___

### JSONSchemaHTTPBinaryConfig

Ƭ **JSONSchemaHTTPBinaryConfig**: [`JSONSchemaHTTPBaseOperationConfig`](loaders_json_schema_src#jsonschemahttpbaseoperationconfig) & \{ `binary`: ``true`` ; `method?`: [`HTTPMethod`](loaders_json_schema_src#httpmethod) ; `path`: `string` ; `requestTypeName?`: `string`  }

#### Defined in

[packages/loaders/json-schema/src/types.ts:73](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L73)

___

### JSONSchemaHTTPJSONOperationConfig

Ƭ **JSONSchemaHTTPJSONOperationConfig**: [`JSONSchemaHTTPBaseOperationConfig`](loaders_json_schema_src#jsonschemahttpbaseoperationconfig) & [`JSONSchemaBaseOperationConfigWithJSONRequest`](loaders_json_schema_src#jsonschemabaseoperationconfigwithjsonrequest)

#### Defined in

[packages/loaders/json-schema/src/types.ts:66](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L66)

___

### JSONSchemaOperationConfig

Ƭ **JSONSchemaOperationConfig**: [`JSONSchemaHTTPJSONOperationConfig`](loaders_json_schema_src#jsonschemahttpjsonoperationconfig) \| [`JSONSchemaHTTPBinaryConfig`](loaders_json_schema_src#jsonschemahttpbinaryconfig) \| [`JSONSchemaPubSubOperationConfig`](loaders_json_schema_src#jsonschemapubsuboperationconfig)

#### Defined in

[packages/loaders/json-schema/src/types.ts:80](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L80)

___

### JSONSchemaPubSubOperationConfig

Ƭ **JSONSchemaPubSubOperationConfig**: [`JSONSchemaBaseOperationConfigWithJSONRequest`](loaders_json_schema_src#jsonschemabaseoperationconfigwithjsonrequest) & \{ `pubsubTopic`: `string`  }

#### Defined in

[packages/loaders/json-schema/src/types.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L69)

## Variables

### anySchema

• `Const` **anySchema**: [`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)

#### Defined in

[packages/loaders/json-schema/src/getReferencedJSONSchemaFromOperations.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getReferencedJSONSchemaFromOperations.ts#L9)

## Functions

### createBundle

▸ **createBundle**(`name`, `__namedParameters`): `Promise`\<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `__namedParameters` | [`JSONSchemaLoaderBundleOptions`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundleOptions) |

#### Returns

`Promise`\<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:32](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L32)

___

### getComposerFromJSONSchema

▸ **getComposerFromJSONSchema**(`schema`, `logger`, `generateInterfaceFromSharedFields?`): `Promise`\<`TypeComposers`>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `schema` | [`JSONSchema`](json_machete_src#jsonschema) | `undefined` |
| `logger` | [`Logger`](types_src#logger) | `undefined` |
| `generateInterfaceFromSharedFields` | `boolean` | `false` |

#### Returns

`Promise`\<`TypeComposers`>

#### Defined in

[packages/loaders/json-schema/src/getComposerFromJSONSchema.ts:76](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getComposerFromJSONSchema.ts#L76)

___

### getDereferencedJSONSchemaFromOperations

▸ **getDereferencedJSONSchemaFromOperations**(`__namedParameters`): `Promise`\<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.cwd` | `string` |
| `__namedParameters.fetchFn` | (`input`: `URL` \| `RequestInfo`, `init?`: `RequestInit`) => `Promise`\<`Response`> |
| `__namedParameters.ignoreErrorResponses?` | `boolean` |
| `__namedParameters.logger` | [`Logger`](types_src#logger) |
| `__namedParameters.noDeduplication?` | `boolean` |
| `__namedParameters.operations` | [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[] |
| `__namedParameters.schemaHeaders?` | `Record`\<`string`, `string`> |

#### Returns

`Promise`\<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)>

#### Defined in

[packages/loaders/json-schema/src/getDereferencedJSONSchemaFromOperations.ts:8](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getDereferencedJSONSchemaFromOperations.ts#L8)

___

### getGraphQLSchemaFromBundle

▸ **getGraphQLSchemaFromBundle**(`__namedParameters`, `__namedParameters?`): `Promise`\<`GraphQLSchema`>

Generates a local GraphQLSchema instance from
previously generated JSON Schema bundle

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle) |
| `__namedParameters` | [`JSONSchemaLoaderBundleToGraphQLSchemaOptions`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions) |

#### Returns

`Promise`\<`GraphQLSchema`>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:83](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L83)

___

### getGraphQLSchemaFromDereferencedJSONSchema

▸ **getGraphQLSchemaFromDereferencedJSONSchema**(`fullyDeferencedSchema`, `__namedParameters`): `Promise`\<`GraphQLSchema`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `fullyDeferencedSchema` | [`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject) |
| `__namedParameters` | `AddExecutionLogicToComposerOptions` & \{ `generateInterfaceFromSharedFields?`: `boolean`  } |

#### Returns

`Promise`\<`GraphQLSchema`>

#### Defined in

[packages/loaders/json-schema/src/getGraphQLSchemaFromDereferencedJSONSchema.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getGraphQLSchemaFromDereferencedJSONSchema.ts#L7)

___

### getReferencedJSONSchemaFromOperations

▸ **getReferencedJSONSchemaFromOperations**(`__namedParameters`): `Promise`\<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.cwd` | `string` |
| `__namedParameters.fetchFn` | (`input`: `URL` \| `RequestInfo`, `init?`: `RequestInit`) => `Promise`\<`Response`> |
| `__namedParameters.ignoreErrorResponses?` | `boolean` |
| `__namedParameters.logger?` | [`Logger`](types_src#logger) |
| `__namedParameters.operations` | [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[] |
| `__namedParameters.schemaHeaders?` | `Object` |

#### Returns

`Promise`\<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)>

#### Defined in

[packages/loaders/json-schema/src/getReferencedJSONSchemaFromOperations.ts:93](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getReferencedJSONSchemaFromOperations.ts#L93)

___

### loadGraphQLSchemaFromJSONSchemas

▸ **loadGraphQLSchemaFromJSONSchemas**(`name`, `options`): `Promise`\<`GraphQLSchema`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `options` | [`JSONSchemaLoaderOptions`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderOptions) |

#### Returns

`Promise`\<`GraphQLSchema`>

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L6)
