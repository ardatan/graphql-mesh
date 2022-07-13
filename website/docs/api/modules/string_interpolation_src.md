---
id: "string-interpolation"
title: "@graphql-mesh/string-interpolation"
sidebar_label: "string-interpolation"
---

## Table of contents

### Classes

- [Interpolator](/docs/api/classes/string_interpolation_src.Interpolator)

### Type Aliases

- [ResolverData](string_interpolation_src#resolverdata)
- [ResolverDataBasedFactory](string_interpolation_src#resolverdatabasedfactory)

### Variables

- [stringInterpolator](string_interpolation_src#stringinterpolator)

### Functions

- [getInterpolatedHeadersFactory](string_interpolation_src#getinterpolatedheadersfactory)
- [getInterpolatedStringFactory](string_interpolation_src#getinterpolatedstringfactory)
- [getInterpolationKeys](string_interpolation_src#getinterpolationkeys)
- [hashObject](string_interpolation_src#hashobject)
- [parseInterpolationStrings](string_interpolation_src#parseinterpolationstrings)

## Type Aliases

### ResolverData

Ƭ **ResolverData**<`TParent`, `TArgs`, `TContext`, `TResult`\>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TParent` | `any` |
| `TArgs` | `any` |
| `TContext` | `any` |
| `TResult` | `any` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `args?` | `TArgs` |
| `context?` | `TContext` |
| `env` | `Record`<`string`, `string`\> |
| `info?` | `GraphQLResolveInfo` |
| `result?` | `TResult` |
| `root?` | `TParent` |

#### Defined in

[packages/string-interpolation/src/resolver-data-factory.ts:4](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/resolver-data-factory.ts#L4)

___

### ResolverDataBasedFactory

Ƭ **ResolverDataBasedFactory**<`T`\>: (`data`: [`ResolverData`](string_interpolation_src#resolverdata)) => `T`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Type declaration

▸ (`data`): `T`

##### Parameters

| Name | Type |
| :------ | :------ |
| `data` | [`ResolverData`](string_interpolation_src#resolverdata) |

##### Returns

`T`

#### Defined in

[packages/string-interpolation/src/resolver-data-factory.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/resolver-data-factory.ts#L12)

## Variables

### stringInterpolator

• `Const` **stringInterpolator**: [`Interpolator`](/docs/api/classes/string_interpolation_src.Interpolator)

#### Defined in

[packages/string-interpolation/src/index.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/string-interpolation/src/index.ts#L12)

## Functions

### getInterpolatedHeadersFactory

▸ **getInterpolatedHeadersFactory**(`nonInterpolatedHeaders?`): [`ResolverDataBasedFactory`](string_interpolation_src#resolverdatabasedfactory)<`Record`<`string`, `string`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `nonInterpolatedHeaders` | `Record`<`string`, `string`\> |

#### Returns

[`ResolverDataBasedFactory`](string_interpolation_src#resolverdatabasedfactory)<`Record`<`string`, `string`\>\>

___

### getInterpolatedStringFactory

▸ **getInterpolatedStringFactory**(`nonInterpolatedString`): [`ResolverDataBasedFactory`](string_interpolation_src#resolverdatabasedfactory)<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `nonInterpolatedString` | `string` |

#### Returns

[`ResolverDataBasedFactory`](string_interpolation_src#resolverdatabasedfactory)<`string`\>

___

### getInterpolationKeys

▸ **getInterpolationKeys**(...`interpolationStrings`): `any`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `...interpolationStrings` | `string`[] |

#### Returns

`any`[]

___

### hashObject

▸ **hashObject**(`value`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `any` |

#### Returns

`string`

___

### parseInterpolationStrings

▸ **parseInterpolationStrings**(`interpolationStrings`, `argTypeMap?`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `interpolationStrings` | `Iterable`<`string`\> |
| `argTypeMap?` | `Record`<`string`, `string` \| `GraphQLInputType`\> |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `args` | `Record`<`string`, { `type`: `string` \| `GraphQLInputType`  }\> |
| `contextVariables` | `Record`<`string`, `string`\> |
