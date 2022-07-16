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

#### Defined in

[packages/string-interpolation/src/interpolator.js:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L7)

## Properties

### aliases

• **aliases**: `any`[]

#### Defined in

[packages/string-interpolation/src/interpolator.js:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L10)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L19)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:168](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L168)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:138](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L138)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:158](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L158)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:119](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L119)

___

### delimiterEnd

▸ **delimiterEnd**(): `string`

#### Returns

`string`

#### Defined in

[packages/string-interpolation/src/interpolator.js:27](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L27)

___

### delimiterStart

▸ **delimiterStart**(): `string`

#### Returns

`string`

#### Defined in

[packages/string-interpolation/src/interpolator.js:23](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L23)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:81](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L81)

___

### extractRules

▸ **extractRules**(`matches`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `matches` | `any` |

#### Returns

`any`

#### Defined in

[packages/string-interpolation/src/interpolator.js:53](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L53)

___

### getAlternativeText

▸ **getAlternativeText**(`str`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |

#### Returns

`any`

#### Defined in

[packages/string-interpolation/src/interpolator.js:85](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L85)

___

### getFromAlias

▸ **getFromAlias**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |

#### Returns

`any`

#### Defined in

[packages/string-interpolation/src/interpolator.js:134](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L134)

___

### getKeyFromMatch

▸ **getKeyFromMatch**(`match`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `match` | `any` |

#### Returns

`any`

#### Defined in

[packages/string-interpolation/src/interpolator.js:66](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L66)

___

### getModifier

▸ **getModifier**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |

#### Returns

`any`

#### Defined in

[packages/string-interpolation/src/interpolator.js:154](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L154)

___

### getModifiers

▸ **getModifiers**(`str`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |

#### Returns

`any`

#### Defined in

[packages/string-interpolation/src/interpolator.js:97](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L97)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:106](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L106)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:115](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L115)

___

### parseRules

▸ **parseRules**(`str`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `any` |

#### Returns

`any`

#### Defined in

[packages/string-interpolation/src/interpolator.js:44](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L44)

___

### registerBuiltInModifiers

▸ **registerBuiltInModifiers**(): [`Interpolator`](string_interpolation_src.Interpolator)

#### Returns

[`Interpolator`](string_interpolation_src.Interpolator)

#### Defined in

[packages/string-interpolation/src/interpolator.js:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L14)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L31)

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

#### Defined in

[packages/string-interpolation/src/interpolator.js:77](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L77)

___

### removeAlias

▸ **removeAlias**(`key`): [`Interpolator`](string_interpolation_src.Interpolator)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |

#### Returns

[`Interpolator`](string_interpolation_src.Interpolator)

#### Defined in

[packages/string-interpolation/src/interpolator.js:177](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L177)

___

### removeDelimiter

▸ **removeDelimiter**(`val`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `val` | `any` |

#### Returns

`any`

#### Defined in

[packages/string-interpolation/src/interpolator.js:73](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/interpolator.js#L73)
