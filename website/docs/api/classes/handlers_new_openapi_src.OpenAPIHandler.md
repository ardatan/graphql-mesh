---
title: 'OpenAPIHandler'
---

# Class: OpenAPIHandler

[handlers/new-openapi/src](../modules/handlers_new_openapi_src).OpenAPIHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_new_openapi_src.OpenAPIHandler#constructor)

### Methods

- [getDereferencedBundle](handlers_new_openapi_src.OpenAPIHandler#getdereferencedbundle)
- [getMeshSource](handlers_new_openapi_src.OpenAPIHandler#getmeshsource)

## Constructors

### constructor

• **new OpenAPIHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`NewOpenapiHandler`](/docs/api/interfaces/types_src.YamlConfig.NewOpenapiHandler)\> |

## Methods

### getDereferencedBundle

▸ **getDereferencedBundle**(): `Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Returns

`Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)\>

#### Implementation of

MeshHandler.getMeshSource
