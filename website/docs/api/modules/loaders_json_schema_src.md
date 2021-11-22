---
id: "@omnigraph_json-schema"
title: "@omnigraph/json-schema"
sidebar_label: "@omnigraph_json-schema"
---

## Table of contents

### References

- [loadGraphQLSchemaFromJSONSchemas](loaders_json_schema_src#loadgraphqlschemafromjsonschemas)

### Interfaces

- [AddExecutionLogicToComposerOptions](/docs/api/interfaces/loaders_json_schema_src.AddExecutionLogicToComposerOptions)
- [JSONSchemaBaseOperationConfig](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaBaseOperationConfig)
- [JSONSchemaBaseOperationConfigWithJSONRequest](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaBaseOperationConfigWithJSONRequest)
- [JSONSchemaHTTPBaseOperationConfig](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaHTTPBaseOperationConfig)
- [JSONSchemaHTTPBinaryConfig](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaHTTPBinaryConfig)
- [JSONSchemaHTTPJSONOperationConfig](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig)
- [JSONSchemaLoaderOptions](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderOptions)
- [JSONSchemaPubSubOperationConfig](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaPubSubOperationConfig)

### Type aliases

- [HTTPMethod](loaders_json_schema_src#httpmethod)
- [JSONSchemaOperationConfig](loaders_json_schema_src#jsonschemaoperationconfig)

### Functions

- [addExecutionLogicToComposer](loaders_json_schema_src#addexecutionlogictocomposer)
- [getComposerFromJSONSchema](loaders_json_schema_src#getcomposerfromjsonschema)
- [getDereferencedJSONSchemaFromOperations](loaders_json_schema_src#getdereferencedjsonschemafromoperations)
- [getGraphQLSchemaFromDereferencedJSONSchema](loaders_json_schema_src#getgraphqlschemafromdereferencedjsonschema)
- [getReferencedJSONSchemaFromOperations](loaders_json_schema_src#getreferencedjsonschemafromoperations)
- [loadGraphQLSchemaFromJSONSchemas](loaders_json_schema_src#loadgraphqlschemafromjsonschemas)

## References

### loadGraphQLSchemaFromJSONSchemas

Re-exports [loadGraphQLSchemaFromJSONSchemas](loaders_json_schema_src#loadgraphqlschemafromjsonschemas)

## Type aliases

### HTTPMethod

Ƭ **HTTPMethod**: ``"GET"`` \| ``"HEAD"`` \| ``"POST"`` \| ``"PUT"`` \| ``"DELETE"`` \| ``"CONNECT"`` \| ``"OPTIONS"`` \| ``"TRACE"`` \| ``"PATCH"``

#### Defined in

[packages/loaders/json-schema/src/types.ts:22](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L22)

___

### JSONSchemaOperationConfig

Ƭ **JSONSchemaOperationConfig**: [`JSONSchemaHTTPJSONOperationConfig`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaHTTPJSONOperationConfig) \| [`JSONSchemaHTTPBinaryConfig`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaHTTPBinaryConfig) \| [`JSONSchemaPubSubOperationConfig`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaPubSubOperationConfig)

#### Defined in

[packages/loaders/json-schema/src/types.ts:46](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/types.ts#L46)

## Functions

### addExecutionLogicToComposer

▸ **addExecutionLogicToComposer**(`schemaComposer`, `__namedParameters`): `Promise`<`SchemaComposer`<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `schemaComposer` | `SchemaComposer`<`any`\> |
| `__namedParameters` | [`AddExecutionLogicToComposerOptions`](/docs/api/interfaces/loaders_json_schema_src.AddExecutionLogicToComposerOptions) |

#### Returns

`Promise`<`SchemaComposer`<`any`\>\>

#### Defined in

[packages/loaders/json-schema/src/addExecutionLogicToComposer.ts:23](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/addExecutionLogicToComposer.ts#L23)

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

[packages/loaders/json-schema/src/getComposerFromJSONSchema.ts:44](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getComposerFromJSONSchema.ts#L44)

___

### getDereferencedJSONSchemaFromOperations

▸ **getDereferencedJSONSchemaFromOperations**(`__namedParameters`): `Promise`<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.cwd` | `string` |
| `__namedParameters.fetch` | (`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`<`Response`\> |
| `__namedParameters.logger` | [`Logger`](types_src#logger) |
| `__namedParameters.operations` | [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[] |

#### Returns

`Promise`<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:24](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L24)

___

### getGraphQLSchemaFromDereferencedJSONSchema

▸ **getGraphQLSchemaFromDereferencedJSONSchema**(`fullyDeferencedSchema`, `__namedParameters`): `Promise`<`GraphQLSchema`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `fullyDeferencedSchema` | [`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject) |
| `__namedParameters` | [`AddExecutionLogicToComposerOptions`](/docs/api/interfaces/loaders_json_schema_src.AddExecutionLogicToComposerOptions) & { `generateInterfaceFromSharedFields?`: `boolean`  } |

#### Returns

`Promise`<`GraphQLSchema`\>

#### Defined in

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:72](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L72)

___

### getReferencedJSONSchemaFromOperations

▸ **getReferencedJSONSchemaFromOperations**(`__namedParameters`): `Promise`<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.cwd` | `string` |
| `__namedParameters.operations` | [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[] |

#### Returns

`Promise`<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Defined in

[packages/loaders/json-schema/src/getReferencedJSONSchemaFromOperations.ts:26](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/getReferencedJSONSchemaFromOperations.ts#L26)

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

[packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts:49](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/loadGraphQLSchemaFromJSONSchemas.ts#L49)
