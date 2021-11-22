---
title: 'MergedRootFieldConfig'
---

# Interface: MergedRootFieldConfig

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).MergedRootFieldConfig

## Table of contents

### Properties

- [additionalArgs](types_src.YamlConfig.MergedRootFieldConfig#additionalargs)
- [argsExpr](types_src.YamlConfig.MergedRootFieldConfig#argsexpr)
- [key](types_src.YamlConfig.MergedRootFieldConfig#key)
- [keyArg](types_src.YamlConfig.MergedRootFieldConfig#keyarg)
- [keyField](types_src.YamlConfig.MergedRootFieldConfig#keyfield)
- [queryFieldName](types_src.YamlConfig.MergedRootFieldConfig#queryfieldname)

## Properties

### additionalArgs

• `Optional` **additionalArgs**: `string`

Specifies a string of additional keys and values to apply to other arguments,
formatted as `\"\"\" arg1: "value", arg2: "value" \"\"\"`.

#### Defined in

[packages/types/src/config.ts:1451](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1451)

___

### argsExpr

• `Optional` **argsExpr**: `string`

Advanced use only; This argument specifies a string expression that allows more customization of the input arguments. Rules for evaluation of this argument are as follows:
  - basic object parsing of the input key: `"arg1: $key.arg1, arg2: $key.arg2"`
  - any expression enclosed by double brackets will be evaluated once for each of the requested keys, and then sent as a list: `"input: { keys: [[$key]] }"`
  - selections from the key can be referenced by using the $ sign and dot notation: `"upcs: [[$key.upc]]"`, so that `$key.upc` refers to the `upc` field of the key.

#### Defined in

[packages/types/src/config.ts:1462](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1462)

___

### key

• `Optional` **key**: `string`[]

Advanced use only; Allows building a custom key just for the argument from the selectionSet included by the `@key` directive.

#### Defined in

[packages/types/src/config.ts:1455](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1455)

___

### keyArg

• `Optional` **keyArg**: `string`

Specifies which field argument receives the merge key. This may be omitted for fields with only one argument where the recipient can be inferred.

#### Defined in

[packages/types/src/config.ts:1446](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1446)

___

### keyField

• `Optional` **keyField**: `string`

Specifies the name of a field to pick off origin objects as the key value. When omitted, a `@key` directive must be included on the return type's definition to be built into an object key.
https://www.graphql-tools.com/docs/stitch-directives-sdl#object-keys

#### Defined in

[packages/types/src/config.ts:1442](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1442)

___

### queryFieldName

• **queryFieldName**: `string`

#### Defined in

[packages/types/src/config.ts:1437](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L1437)
