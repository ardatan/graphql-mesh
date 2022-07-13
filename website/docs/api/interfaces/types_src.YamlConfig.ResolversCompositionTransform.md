---
title: 'ResolversCompositionTransform'
---

# Interface: ResolversCompositionTransform

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).ResolversCompositionTransform

## Table of contents

### Properties

- [compositions](types_src.YamlConfig.ResolversCompositionTransform#compositions)
- [mode](types_src.YamlConfig.ResolversCompositionTransform#mode)

## Properties

### compositions

• **compositions**: [`ResolversCompositionTransformObject`](types_src.YamlConfig.ResolversCompositionTransformObject)[]

Array of resolver/composer to apply

#### Defined in

[packages/types/src/config.ts:1631](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1631)

___

### mode

• `Optional` **mode**: ``"bare"`` \| ``"wrap"``

Specify to apply resolvers-composition transforms to bare schema or by wrapping original schema (Allowed values: bare, wrap)

#### Defined in

[packages/types/src/config.ts:1627](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1627)
