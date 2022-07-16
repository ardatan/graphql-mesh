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

## Properties

### name

• `Optional` **name**: `string`

#### Implementation of

Logger.name

#### Defined in

[packages/utils/src/logger.ts:27](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L27)

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
