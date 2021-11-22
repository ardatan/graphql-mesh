---
title: 'EncapsulateTransformObject'
---

# Interface: EncapsulateTransformObject

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).EncapsulateTransformObject

Transformer to apply encapsulation to the API source, by creating a field for it under the root query

## Table of contents

### Properties

- [applyTo](types_src.YamlConfig.EncapsulateTransformObject#applyto)
- [name](types_src.YamlConfig.EncapsulateTransformObject#name)

## Properties

### applyTo

• `Optional` **applyTo**: [`EncapsulateTransformApplyTo`](types_src.YamlConfig.EncapsulateTransformApplyTo)

#### Defined in

[packages/types/src/config.ts:1059](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1059)

___

### name

• `Optional` **name**: `string`

Optional, name to use for grouping under the root types. If not specific, the API name is used.

#### Defined in

[packages/types/src/config.ts:1058](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1058)
