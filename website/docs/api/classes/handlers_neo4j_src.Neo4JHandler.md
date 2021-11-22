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

### Methods

- [getCachedTypeDefs](handlers_neo4j_src.Neo4JHandler#getcachedtypedefs)
- [getDriver](handlers_neo4j_src.Neo4JHandler#getdriver)
- [getMeshSource](handlers_neo4j_src.Neo4JHandler#getmeshsource)

## Constructors

### constructor

• **new Neo4JHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`Neo4JHandler`](/docs/api/interfaces/types_src.YamlConfig.Neo4JHandler)\> |

#### Defined in

[packages/handlers/neo4j/src/index.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/neo4j/src/index.ts#L18)

## Methods

### getCachedTypeDefs

▸ **getCachedTypeDefs**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Defined in

[packages/handlers/neo4j/src/index.ts:54](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/neo4j/src/index.ts#L54)

___

### getDriver

▸ **getDriver**(): `Driver`

#### Returns

`Driver`

#### Defined in

[packages/handlers/neo4j/src/index.ts:29](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/neo4j/src/index.ts#L29)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<`Object`\>

#### Returns

`Promise`<`Object`\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/neo4j/src/index.ts:70](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/neo4j/src/index.ts#L70)
