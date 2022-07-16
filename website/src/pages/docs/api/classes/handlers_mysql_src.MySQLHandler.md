---
title: 'MySQLHandler'
---

# Class: MySQLHandler

[handlers/mysql/src](../modules/handlers_mysql_src).MySQLHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_mysql_src.MySQLHandler#constructor)

### Methods

- [getMeshSource](handlers_mysql_src.MySQLHandler#getmeshsource)

## Constructors

### constructor

• **new MySQLHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)\<[`MySQLHandler`](/docs/api/interfaces/types_src.YamlConfig.MySQLHandler)> |

#### Defined in

[packages/handlers/mysql/src/index.ts:136](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/mysql/src/index.ts#L136)

## Methods

### getMeshSource

▸ **getMeshSource**(): `Promise`\<[`MeshSource`](../modules/types_src#meshsource)>

#### Returns

`Promise`\<[`MeshSource`](../modules/types_src#meshsource)>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/mysql/src/index.ts:173](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/mysql/src/index.ts#L173)
