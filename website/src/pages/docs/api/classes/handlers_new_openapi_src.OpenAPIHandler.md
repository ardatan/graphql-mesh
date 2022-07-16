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
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)\<[`NewOpenapiHandler`](/docs/api/interfaces/types_src.YamlConfig.NewOpenapiHandler)> |

#### Defined in

[packages/handlers/new-openapi/src/index.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/new-openapi/src/index.ts#L13)

## Methods

### getDereferencedBundle

▸ **getDereferencedBundle**(): `Promise`\<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)>

#### Returns

`Promise`\<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)>

#### Defined in

[packages/handlers/new-openapi/src/index.ts:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/new-openapi/src/index.ts#L31)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`\<[`MeshSource`](../modules/types_src#meshsource)>

#### Returns

`Promise`\<[`MeshSource`](../modules/types_src#meshsource)>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/new-openapi/src/index.ts:49](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/new-openapi/src/index.ts#L49)
