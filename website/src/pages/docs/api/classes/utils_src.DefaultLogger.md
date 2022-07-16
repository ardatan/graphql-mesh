---
title: 'DefaultLogger'
---

# Class: DefaultLogger

[utils/src](../modules/utils_src).DefaultLogger

## Implements

- [`Logger`](../modules/types_src#logger)

## Table of contents

### Constructors

- [constructor](utils_src.DefaultLogger#constructor)

### Properties

- [name](utils_src.DefaultLogger#name)

### Methods

- [child](utils_src.DefaultLogger#child)
- [debug](utils_src.DefaultLogger#debug)
- [error](utils_src.DefaultLogger#error)
- [info](utils_src.DefaultLogger#info)
- [log](utils_src.DefaultLogger#log)
- [warn](utils_src.DefaultLogger#warn)

## Constructors

### constructor

• **new DefaultLogger**(`name?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name?` | `string` |

#### Defined in

[packages/utils/src/logger.ts:27](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L27)

## Properties

### name

• `Optional` **name**: `string`

#### Implementation of

Logger.name

## Methods

### child

▸ **child**(`name`): [`Logger`](../modules/types_src#logger)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

[`Logger`](../modules/types_src#logger)

#### Implementation of

Logger.child

#### Defined in

[packages/utils/src/logger.ts:111](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L111)

___

### debug

▸ **debug**(...`lazyArgs`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...lazyArgs` | `any`[] |

#### Returns

`void`

#### Implementation of

Logger.debug

#### Defined in

[packages/utils/src/logger.ts:99](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L99)

___

### error

▸ **error**(...`args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Logger.error

#### Defined in

[packages/utils/src/logger.ts:93](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L93)

___

### info

▸ **info**(...`args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Logger.info

#### Defined in

[packages/utils/src/logger.ts:83](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L83)

___

### log

▸ **log**(...`args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Logger.log

#### Defined in

[packages/utils/src/logger.ts:68](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L68)

___

### warn

▸ **warn**(...`args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Logger.warn

#### Defined in

[packages/utils/src/logger.ts:73](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L73)
