---
title: 'ServeMeshOptions'
---

# Interface: ServeMeshOptions

[runtime/src](../modules/runtime_src).ServeMeshOptions

## Table of contents

### Properties

- [argsPort](runtime_src.ServeMeshOptions#argsport)
- [baseDir](runtime_src.ServeMeshOptions#basedir)
- [logger](runtime_src.ServeMeshOptions#logger)
- [playgroundTitle](runtime_src.ServeMeshOptions#playgroundtitle)
- [rawServeConfig](runtime_src.ServeMeshOptions#rawserveconfig)

### Methods

- [getBuiltMesh](runtime_src.ServeMeshOptions#getbuiltmesh)

## Properties

### argsPort

• `Optional` **argsPort**: `number`

#### Defined in

[packages/runtime/src/types.ts:63](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L63)

___

### baseDir

• **baseDir**: `string`

#### Defined in

[packages/runtime/src/types.ts:59](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L59)

___

### logger

• **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/runtime/src/types.ts:61](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L61)

___

### playgroundTitle

• `Optional` **playgroundTitle**: `string`

#### Defined in

[packages/runtime/src/types.ts:64](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L64)

___

### rawServeConfig

• **rawServeConfig**: [`ServeConfig`](types_src.YamlConfig.ServeConfig)

#### Defined in

[packages/runtime/src/types.ts:62](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L62)

## Methods

### getBuiltMesh

▸ **getBuiltMesh**(): `Promise`\<[`MeshInstance`](runtime_src.MeshInstance)>

#### Returns

`Promise`\<[`MeshInstance`](runtime_src.MeshInstance)>

#### Defined in

[packages/runtime/src/types.ts:60](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L60)
