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
- [rawConfig](runtime_src.ServeMeshOptions#rawconfig)

### Methods

- [getBuiltMesh](runtime_src.ServeMeshOptions#getbuiltmesh)

## Properties

### argsPort

• `Optional` **argsPort**: `number`

#### Defined in

[packages/runtime/src/types.ts:65](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L65)

___

### baseDir

• **baseDir**: `string`

#### Defined in

[packages/runtime/src/types.ts:61](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L61)

___

### logger

• **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/runtime/src/types.ts:63](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L63)

___

### playgroundTitle

• `Optional` **playgroundTitle**: `string`

#### Defined in

[packages/runtime/src/types.ts:66](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L66)

___

### rawConfig

• **rawConfig**: [`Config`](types_src.YamlConfig.Config)

#### Defined in

[packages/runtime/src/types.ts:64](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L64)

## Methods

### getBuiltMesh

▸ **getBuiltMesh**(): `Promise`<[`MeshInstance`](runtime_src.MeshInstance)<`any`\>\>

#### Returns

`Promise`<[`MeshInstance`](runtime_src.MeshInstance)<`any`\>\>

#### Defined in

[packages/runtime/src/types.ts:62](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L62)
