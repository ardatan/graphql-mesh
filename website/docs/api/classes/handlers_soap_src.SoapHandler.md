---
title: 'SoapHandler'
---

# Class: SoapHandler

[handlers/soap/src](../modules/handlers_soap_src).SoapHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_soap_src.SoapHandler#constructor)

### Methods

- [getMeshSource](handlers_soap_src.SoapHandler#getmeshsource)

## Constructors

### constructor

• **new SoapHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`SoapHandler`](/docs/api/interfaces/types_src.YamlConfig.SoapHandler)\> |

#### Defined in

[packages/handlers/soap/src/index.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/soap/src/index.ts#L16)

## Methods

### getMeshSource

▸ **getMeshSource**(): `Promise`<{ `schema`: `GraphQLSchema`  }\>

#### Returns

`Promise`<{ `schema`: `GraphQLSchema`  }\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/soap/src/index.ts:25](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/soap/src/index.ts#L25)
