---
title: 'OpenAPIHandler'
---

# Class: OpenAPIHandler

[handlers/openapi/src](../modules/handlers_openapi_src).OpenAPIHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_openapi_src.OpenAPIHandler#constructor)

### Methods

- [getMeshSource](handlers_openapi_src.OpenAPIHandler#getmeshsource)

## Constructors

### constructor

• **new OpenAPIHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`OpenapiHandler`](/docs/api/interfaces/types_src.YamlConfig.OpenapiHandler)\> |

#### Defined in

[packages/handlers/openapi/src/index.ts:44](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/openapi/src/index.ts#L44)

## Methods

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/openapi/src/index.ts:110](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/openapi/src/index.ts#L110)
