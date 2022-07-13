---
title: 'Neo4JHandler'
---

# Class: Neo4JHandler

[handlers/neo4j/src](../modules/handlers_neo4j_src).Neo4JHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_neo4j_src.Neo4JHandler#constructor)

### Properties

- [fetchFn](handlers_neo4j_src.Neo4JHandler#fetchfn)
- [importFn](handlers_neo4j_src.Neo4JHandler#importfn)

### Methods

- [getCachedTypeDefs](handlers_neo4j_src.Neo4JHandler#getcachedtypedefs)
- [getMeshSource](handlers_neo4j_src.Neo4JHandler#getmeshsource)

## Constructors

### constructor

• **new Neo4JHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)\<[`Neo4JHandler`](/docs/api/interfaces/types_src.YamlConfig.Neo4JHandler)> |

## Properties

### fetchFn

• **fetchFn**: (`input`: `URL` \| `RequestInfo`, `init?`: `RequestInit`) => `Promise`\<`Response`>

#### Type declaration

▸ (`input`, `init?`): `Promise`\<`Response`>

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `URL` \| `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

`Promise`\<`Response`>

#### Defined in

[packages/handlers/neo4j/src/index.ts:39](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/neo4j/src/index.ts#L39)

___

### importFn

• **importFn**: [`ImportFn`](../modules/types_src#importfn)

#### Defined in

[packages/handlers/neo4j/src/index.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/neo4j/src/index.ts#L40)

## Methods

### getCachedTypeDefs

▸ **getCachedTypeDefs**(`driver`): `Promise`\<`string`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `driver` | `Driver` |

#### Returns

`Promise`\<`string`>

___

### getMeshSource

▸ **getMeshSource**(): `Promise`\<\{ `schema`: `GraphQLSchema`  }>

#### Returns

`Promise`\<\{ `schema`: `GraphQLSchema`  }>

#### Implementation of

MeshHandler.getMeshSource
