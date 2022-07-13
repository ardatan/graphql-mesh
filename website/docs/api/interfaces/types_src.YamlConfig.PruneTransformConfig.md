---
title: 'PruneTransformConfig'
---

# Interface: PruneTransformConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).PruneTransformConfig

Prune transform

## Table of contents

### Properties

- [skipEmptyCompositeTypePruning](types_src.YamlConfig.PruneTransformConfig#skipemptycompositetypepruning)
- [skipEmptyUnionPruning](types_src.YamlConfig.PruneTransformConfig#skipemptyunionpruning)
- [skipPruning](types_src.YamlConfig.PruneTransformConfig#skippruning)
- [skipUnimplementedInterfacesPruning](types_src.YamlConfig.PruneTransformConfig#skipunimplementedinterfacespruning)
- [skipUnusedTypesPruning](types_src.YamlConfig.PruneTransformConfig#skipunusedtypespruning)

## Properties

### skipEmptyCompositeTypePruning

• `Optional` **skipEmptyCompositeTypePruning**: `boolean`

Set to `true` to skip pruning object types or interfaces with no fields

#### Defined in

[packages/types/src/config.ts:1516](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1516)

___

### skipEmptyUnionPruning

• `Optional` **skipEmptyUnionPruning**: `boolean`

Set to `true` to skip pruning empty unions

#### Defined in

[packages/types/src/config.ts:1524](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1524)

___

### skipPruning

• `Optional` **skipPruning**: `string`[]

Types to skip pruning

#### Defined in

[packages/types/src/config.ts:1512](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1512)

___

### skipUnimplementedInterfacesPruning

• `Optional` **skipUnimplementedInterfacesPruning**: `boolean`

Set to `true` to skip pruning interfaces that are not implemented by any other types

#### Defined in

[packages/types/src/config.ts:1520](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1520)

___

### skipUnusedTypesPruning

• `Optional` **skipUnusedTypesPruning**: `boolean`

Set to `true` to skip pruning unused types

#### Defined in

[packages/types/src/config.ts:1528](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1528)
