---
title: 'JsonSchemaHandler'
---

# Class: JsonSchemaHandler

[handlers/json-schema/src](../modules/handlers_json_schema_src).JsonSchemaHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_json_schema_src.JsonSchemaHandler#constructor)

### Methods

- [getDereferencedBundle](handlers_json_schema_src.JsonSchemaHandler#getdereferencedbundle)
- [getMeshSource](handlers_json_schema_src.JsonSchemaHandler#getmeshsource)

## Constructors

### constructor

• **new JsonSchemaHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)\<[`JsonSchemaHandler`](/docs/api/interfaces/types_src.YamlConfig.JsonSchemaHandler) \| [`JsonSchemaHandlerBundle`](/docs/api/interfaces/types_src.YamlConfig.JsonSchemaHandlerBundle)> |

#### Defined in

[packages/handlers/json-schema/src/index.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L18)

## Methods

### getDereferencedBundle

▸ **getDereferencedBundle**(): `Promise`\<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)>

#### Returns

`Promise`\<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)>

#### Defined in

[packages/handlers/json-schema/src/index.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L38)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`\<\{ `schema`: `GraphQLSchema`  }>

#### Returns

`Promise`\<\{ `schema`: `GraphQLSchema`  }>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/json-schema/src/index.ts:66](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L66)
