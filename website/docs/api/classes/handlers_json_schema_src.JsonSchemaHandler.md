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
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`JsonSchemaHandler`](/docs/api/interfaces/types_src.YamlConfig.JsonSchemaHandler) \| [`JsonSchemaHandlerBundle`](/docs/api/interfaces/types_src.YamlConfig.JsonSchemaHandlerBundle)\> |

## Methods

### getDereferencedBundle

▸ **getDereferencedBundle**(): `Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Returns

`Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<{ `schema`: `GraphQLSchema`  }\>

#### Returns

`Promise`<{ `schema`: `GraphQLSchema`  }\>

#### Implementation of

MeshHandler.getMeshSource
