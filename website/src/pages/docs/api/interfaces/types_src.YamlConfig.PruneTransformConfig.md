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

[packages/types/src/config.ts:1519](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1519)

___

### skipEmptyUnionPruning

• `Optional` **skipEmptyUnionPruning**: `boolean`

Set to `true` to skip pruning empty unions

#### Defined in

[packages/types/src/config.ts:1527](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1527)

___

### skipPruning

• `Optional` **skipPruning**: `string`[]

Types to skip pruning

#### Defined in

[packages/types/src/config.ts:1515](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1515)

___

### skipUnimplementedInterfacesPruning

• `Optional` **skipUnimplementedInterfacesPruning**: `boolean`

Set to `true` to skip pruning interfaces that are not implemented by any other types

#### Defined in

[packages/types/src/config.ts:1523](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1523)

___

### skipUnusedTypesPruning

• `Optional` **skipUnusedTypesPruning**: `boolean`

Set to `true` to skip pruning unused types

#### Defined in

[packages/types/src/config.ts:1531](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1531)
