---
id: "@omnigraph_json-schema"
title: "@omnigraph/json-schema"
sidebar_label: "@omnigraph_json-schema"
---

## Table of contents

### References

- [default](loaders_json_schema_src#default)

### Interfaces

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

### Functions

- [createBundle](loaders_json_schema_src#createbundle)
- [getComposerFromJSONSchema](loaders_json_schema_src#getcomposerfromjsonschema)
- [getDereferencedJSONSchemaFromOperations](loaders_json_schema_src#getdereferencedjsonschemafromoperations)
- [getGraphQLSchemaFromBundle](loaders_json_schema_src#getgraphqlschemafrombundle)
- [getGraphQLSchemaFromDereferencedJSONSchema](loaders_json_schema_src#getgraphqlschemafromdereferencedjsonschema)
- [loadGraphQLSchemaFromJSONSchemas](loaders_json_schema_src#loadgraphqlschemafromjsonschemas)

## References

### default

Renames and re-exports [loadGraphQLSchemaFromJSONSchemas](loaders_json_schema_src#loadgraphqlschemafromjsonschemas)

## Type aliases

### HTTPMethod

Ƭ **HTTPMethod**: ``"GET"`` \| ``"HEAD"`` \| ``"POST"`` \| ``"PUT"`` \| ``"DELETE"`` \| ``"CONNECT"`` \| ``"OPTIONS"`` \| ``"TRACE"`` \| ``"PATCH"``

#### Defined in

[packages/loaders/json-schema/src/types.ts:45](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L45)

___

### JSONSchemaBaseOperationConfig

Ƭ **JSONSchemaBaseOperationConfig**: { `argTypeMap?`: `Record`<`string`, `string` \| `GraphQLInputType`\> ; `description?`: `string` ; `field`: `string` ; `type`: `OperationTypeNode`  } & { `responseByStatusCode?`: `Record`<`string`, [`JSONSchemaOperationResponseConfig`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaOperationResponseConfig)\>  } \| [`JSONSchemaOperationResponseConfig`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaOperationResponseConfig)

#### Defined in

[packages/loaders/json-schema/src/types.ts:25](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L25)

___

### JSONSchemaBaseOperationConfigWithJSONRequest

Ƭ **JSONSchemaBaseOperationConfigWithJSONRequest**: [`JSONSchemaBaseOperationConfig`](loaders_json_schema_src#jsonschemabaseoperationconfig) & { `requestBaseBody?`: `any` ; `requestSample?`: `any` ; `requestSchema?`: `string` \| [`JSONSchema`](json_machete_src#jsonschema) ; `requestTypeName?`: `string`  }

#### Defined in

[packages/loaders/json-schema/src/types.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L38)

___

### JSONSchemaHTTPBaseOperationConfig

Ƭ **JSONSchemaHTTPBaseOperationConfig**: [`JSONSchemaBaseOperationConfig`](loaders_json_schema_src#jsonschemabaseoperationconfig) & { `headers?`: `Record`<`string`, `string`\> ; `method?`: [`HTTPMethod`](loaders_json_schema_src#httpmethod) ; `path`: `string`  }

#### Defined in

[packages/loaders/json-schema/src/types.ts:47](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L47)

___

### JSONSchemaHTTPBinaryConfig

Ƭ **JSONSchemaHTTPBinaryConfig**: [`JSONSchemaHTTPBaseOperationConfig`](loaders_json_schema_src#jsonschemahttpbaseoperationconfig) & { `binary`: ``true`` ; `method?`: [`HTTPMethod`](loaders_json_schema_src#httpmethod) ; `path`: `string` ; `requestTypeName?`: `string`  }

#### Defined in

[packages/loaders/json-schema/src/types.ts:61](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L61)

___

### JSONSchemaHTTPJSONOperationConfig

Ƭ **JSONSchemaHTTPJSONOperationConfig**: [`JSONSchemaHTTPBaseOperationConfig`](loaders_json_schema_src#jsonschemahttpbaseoperationconfig) & [`JSONSchemaBaseOperationConfigWithJSONRequest`](loaders_json_schema_src#jsonschemabaseoperationconfigwithjsonrequest)

#### Defined in

[packages/loaders/json-schema/src/types.ts:54](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L54)

___

### JSONSchemaOperationConfig

Ƭ **JSONSchemaOperationConfig**: [`JSONSchemaHTTPJSONOperationConfig`](loaders_json_schema_src#jsonschemahttpjsonoperationconfig) \| [`JSONSchemaHTTPBinaryConfig`](loaders_json_schema_src#jsonschemahttpbinaryconfig) \| [`JSONSchemaPubSubOperationConfig`](loaders_json_schema_src#jsonschemapubsuboperationconfig)

#### Defined in

[packages/loaders/json-schema/src/types.ts:68](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L68)

___

### JSONSchemaPubSubOperationConfig

Ƭ **JSONSchemaPubSubOperationConfig**: [`JSONSchemaBaseOperationConfigWithJSONRequest`](loaders_json_schema_src#jsonschemabaseoperationconfigwithjsonrequest) & { `pubsubTopic`: `string`  }

#### Defined in

[packages/loaders/json-schema/src/types.ts:57](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L57)

## Functions

### createBundle

▸ **createBundle**(`name`, `__namedParameters`): `Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `__namedParameters` | [`JSONSchemaLoaderBundleOptions`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundleOptions) |

#### Returns

`Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L31)

___

### getComposerFromJSONSchema

▸ **getComposerFromJSONSchema**(`schema`, `logger`, `generateInterfaceFromSharedFields?`): `Promise`<`TypeComposers`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `schema` | [`JSONSchema`](json_machete_src#jsonschema) | `undefined` |
| `logger` | [`Logger`](types_src#logger) | `undefined` |
| `generateInterfaceFromSharedFields` | `boolean` | `false` |

#### Returns

`Promise`<`TypeComposers`\>

#### Defined in

[packages/loaders/json-schema/src/getComposerFromJSONSchema.ts:64](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getComposerFromJSONSchema.ts#L64)

___

### getDereferencedJSONSchemaFromOperations

▸ **getDereferencedJSONSchemaFromOperations**(`__namedParameters`): `Promise`<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.cwd` | `string` |
| `__namedParameters.fetch` | (`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`<`Response`\> |
| `__namedParameters.ignoreErrorResponses?` | `boolean` |
| `__namedParameters.logger` | [`Logger`](types_src#logger) |
| `__namedParameters.operations` | [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[] |
| `__namedParameters.schemaHeaders?` | `Record`<`string`, `string`\> |

#### Returns

`Promise`<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Defined in

[packages/loaders/json-schema/src/getDereferencedJSONSchemaFromOperations.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getDereferencedJSONSchemaFromOperations.ts#L7)

___

### getGraphQLSchemaFromBundle

▸ **getGraphQLSchemaFromBundle**(`__namedParameters`, `__namedParameters?`): `Promise`<`GraphQLSchema`\>

Generates a local GraphQLSchema instance from
previously generated JSON Schema bundle

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle) |
| `__namedParameters` | [`JSONSchemaLoaderBundleToGraphQLSchemaOptions`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundleToGraphQLSchemaOptions) |

#### Returns

`Promise`<`GraphQLSchema`\>

#### Defined in

[packages/loaders/json-schema/src/bundle.ts:76](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/bundle.ts#L76)

___

### getGraphQLSchemaFromDereferencedJSONSchema

▸ **getGraphQLSchemaFromDereferencedJSONSchema**(`fullyDeferencedSchema`, `__namedParameters`): `Promise`<`GraphQLSchema`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `fullyDeferencedSchema` | [`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject) |
| `__namedParameters` | `AddExecutionLogicToComposerOptions` & { `generateInterfaceFromSharedFields?`: `boolean`  } |

#### Returns

`Promise`<`GraphQLSchema`\>

#### Defined in

[packages/loaders/json-schema/src/getGraphQLSchemaFromDereferencedJSONSchema.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getGraphQLSchemaFromDereferencedJSONSchema.ts#L7)

___

### loadGraphQLSchemaFromJSONSchemas

▸ **loadGraphQLSchemaFromJSONSchemas**(`name`, `options`): `Promise`<`GraphQLSchema`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `options` | [`JSONSchemaLoaderOptions`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderOptions) |

#### Returns

`Promise`<`GraphQLSchema`\>

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L6)
