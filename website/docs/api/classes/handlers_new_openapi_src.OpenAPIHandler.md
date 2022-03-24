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

#### Defined in

[packages/handlers/new-openapi/src/index.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/new-openapi/src/index.ts#L14)

## Methods

### getDereferencedBundle

▸ **getDereferencedBundle**(): `Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Returns

`Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Defined in

[packages/handlers/new-openapi/src/index.ts:32](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/new-openapi/src/index.ts#L32)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/new-openapi/src/index.ts:48](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/new-openapi/src/index.ts#L48)
