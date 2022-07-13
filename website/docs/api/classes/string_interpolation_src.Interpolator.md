---
title: 'Interpolator'
---

# Class: Interpolator

[string-interpolation/src](../modules/string_interpolation_src).Interpolator

## Table of contents

### Constructors

- [constructor](string_interpolation_src.Interpolator#constructor)

### Properties

- [aliases](string_interpolation_src.Interpolator#aliases)
- [modifiers](string_interpolation_src.Interpolator#modifiers)
- [options](string_interpolation_src.Interpolator#options)

### Accessors

- [delimiter](string_interpolation_src.Interpolator#delimiter)

### Methods

- [addAlias](string_interpolation_src.Interpolator#addalias)
- [applyData](string_interpolation_src.Interpolator#applydata)
- [applyModifiers](string_interpolation_src.Interpolator#applymodifiers)
- [applyRule](string_interpolation_src.Interpolator#applyrule)
- [delimiterEnd](string_interpolation_src.Interpolator#delimiterend)
- [delimiterStart](string_interpolation_src.Interpolator#delimiterstart)
- [extractAfter](string_interpolation_src.Interpolator#extractafter)
- [extractRules](string_interpolation_src.Interpolator#extractrules)
- [getAlternativeText](string_interpolation_src.Interpolator#getalternativetext)
- [getFromAlias](string_interpolation_src.Interpolator#getfromalias)
- [getKeyFromMatch](string_interpolation_src.Interpolator#getkeyfrommatch)
- [getModifier](string_interpolation_src.Interpolator#getmodifier)
- [getModifiers](string_interpolation_src.Interpolator#getmodifiers)
- [parse](string_interpolation_src.Interpolator#parse)
- [parseFromRules](string_interpolation_src.Interpolator#parsefromrules)
- [parseRules](string_interpolation_src.Interpolator#parserules)
- [registerBuiltInModifiers](string_interpolation_src.Interpolator#registerbuiltinmodifiers)
- [registerModifier](string_interpolation_src.Interpolator#registermodifier)
- [removeAfter](string_interpolation_src.Interpolator#removeafter)
- [removeAlias](string_interpolation_src.Interpolator#removealias)
- [removeDelimiter](string_interpolation_src.Interpolator#removedelimiter)

## Constructors

### constructor

• **new Interpolator**(`options?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `options` | `Object` | `defaultOptions` |
| `options.delimiter` | `string`[] | `undefined` |

## Properties

### aliases

• **aliases**: `any`[]

#### Defined in

[packages/string-interpolation/src/interpolator.js:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L10)

[packages/string-interpolation/src/interpolator.js:178](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L178)

___

### modifiers

• **modifiers**: `any`[]

#### Defined in

[packages/string-interpolation/src/interpolator.js:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L9)

___

### options

• **options**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `delimiter` | `string`[] |

#### Defined in

[packages/string-interpolation/src/interpolator.js:8](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L8)

## Accessors

### delimiter

• `get` **delimiter**(): `string`[]

#### Returns

`string`[]

## Methods

### addAlias

▸ **addAlias**(`key`, `ref`): [`Interpolator`](string_interpolation_src.Interpolator)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |
| `ref` | `any` |

#### Returns

[`Interpolator`](string_interpolation_src.Interpolator)

___

### applyData

▸ **applyData**(`key`, `data`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |
| `data` | `any` |

#### Returns

`any`

___

### applyModifiers

▸ **applyModifiers**(`modifiers`, `str`, `rawData`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `modifiers` | `any` |
| `str` | `any` |
| `rawData` | `any` |

#### Returns

`any`

___

### applyRule

▸ **applyRule**(`str`, `rule`, `data?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |
| `rule` | `any` |
| `data` | `Object` |

#### Returns

`any`

___

### delimiterEnd

▸ **delimiterEnd**(): `string`

#### Returns

`string`

___

### delimiterStart

▸ **delimiterStart**(): `string`

#### Returns

`string`

___

### extractAfter

▸ **extractAfter**(`str`, `val`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |
| `val` | `any` |

#### Returns

`any`

___

### extractRules

▸ **extractRules**(`matches`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `matches` | `any` |

#### Returns

`any`

___

### getAlternativeText

▸ **getAlternativeText**(`str`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |

#### Returns

`any`

___

### getFromAlias

▸ **getFromAlias**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |

#### Returns

`any`

___

### getKeyFromMatch

▸ **getKeyFromMatch**(`match`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `match` | `any` |

#### Returns

`any`

___

### getModifier

▸ **getModifier**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |

#### Returns

`any`

___

### getModifiers

▸ **getModifiers**(`str`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |

#### Returns

`any`

___

### parse

▸ **parse**(`str?`, `data?`): `any`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `str` | `string` | `''` |
| `data` | `Object` | `\{}` |

#### Returns

`any`

___

### parseFromRules

▸ **parseFromRules**(`str`, `data`, `rules`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |
| `data` | `any` |
| `rules` | `any` |

#### Returns

`any`

___

### parseRules

▸ **parseRules**(`str`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |

#### Returns

`any`

___

### registerBuiltInModifiers

▸ **registerBuiltInModifiers**(): [`Interpolator`](string_interpolation_src.Interpolator)

#### Returns

[`Interpolator`](string_interpolation_src.Interpolator)

___

### registerModifier

▸ **registerModifier**(`key`, `transform`): `Error` \| [`Interpolator`](string_interpolation_src.Interpolator)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |
| `transform` | `any` |

#### Returns

`Error` \| [`Interpolator`](string_interpolation_src.Interpolator)

___

### removeAfter

▸ **removeAfter**(`str`, `val`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |
| `val` | `any` |

#### Returns

`any`

___

### removeAlias

▸ **removeAlias**(`key`): [`Interpolator`](string_interpolation_src.Interpolator)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |

#### Returns

[`Interpolator`](string_interpolation_src.Interpolator)

___

### removeDelimiter

▸ **removeDelimiter**(`val`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `val` | `any` |

#### Returns

`any`
