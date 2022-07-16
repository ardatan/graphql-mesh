---
title: 'ThriftHandler'
---

# Class: ThriftHandler

[handlers/thrift/src](../modules/handlers_thrift_src).ThriftHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_thrift_src.ThriftHandler#constructor)

### Methods

- [getMeshSource](handlers_thrift_src.ThriftHandler#getmeshsource)

## Constructors

### constructor

• **new ThriftHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)\<[`ThriftHandler`](/docs/api/interfaces/types_src.YamlConfig.ThriftHandler)> |

#### Defined in

[packages/handlers/thrift/src/index.ts:53](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/thrift/src/index.ts#L53)

## Methods

### getMeshSource

▸ **getMeshSource**(): `Promise`\<\{ `contextVariables`: `Record`\<`string`, `string`> ; `schema`: `GraphQLSchema`  }>

#### Returns

`Promise`\<\{ `contextVariables`: `Record`\<`string`, `string`> ; `schema`: `GraphQLSchema`  }>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/thrift/src/index.ts:62](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/thrift/src/index.ts#L62)
