---
id: "config"
title: "@graphql-mesh/config"
sidebar_label: "config"
---

## Table of contents

### Type aliases

- [ConfigProcessOptions](config_src#configprocessoptions)
- [ProcessedConfig](config_src#processedconfig)

### Functions

- [getPackage](config_src#getpackage)
- [processConfig](config_src#processconfig)
- [resolveAdditionalTypeDefs](config_src#resolveadditionaltypedefs)
- [resolveCache](config_src#resolvecache)
- [resolveDocuments](config_src#resolvedocuments)
- [resolveLogger](config_src#resolvelogger)
- [resolvePubSub](config_src#resolvepubsub)

## Type aliases

### ConfigProcessOptions

Ƭ **ConfigProcessOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `dir?` | `string` |
| `ignoreAdditionalResolvers?` | `boolean` |
| `importFn?` | [`ImportFn`](types_src#importfn) |
| `store?` | [`MeshStore`](/docs/api/classes/store_src.MeshStore) |

#### Defined in

[packages/config/src/process.ts:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/process.ts#L31)

___

### ProcessedConfig

Ƭ **ProcessedConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `additionalResolvers` | `IResolvers`[] |
| `additionalTypeDefs` | `DocumentNode`[] |
| `cache` | [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)<`string`\> |
| `code` | `string` |
| `config` | [`Config`](/docs/api/interfaces/types_src.YamlConfig.Config) |
| `documents` | `Source`[] |
| `logger` | [`Logger`](types_src#logger) |
| `merger` | [`MeshMerger`](/docs/api/interfaces/types_src.MeshMerger) |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `sources` | [`MeshResolvedSource`](runtime_src#meshresolvedsource)<`any`\>[] |
| `store` | [`MeshStore`](/docs/api/classes/store_src.MeshStore) |
| `transforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/config/src/process.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/process.ts#L38)

## Functions

### getPackage

▸ **getPackage**<`T`\>(`__namedParameters`): `Promise`<`ResolvedPackage`<`T`\>\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetPackageOptions` |

#### Returns

`Promise`<`ResolvedPackage`<`T`\>\>

#### Defined in

[packages/config/src/utils.ts:25](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L25)

___

### processConfig

▸ **processConfig**(`config`, `options?`): `Promise`<[`ProcessedConfig`](config_src#processedconfig)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`Config`](/docs/api/interfaces/types_src.YamlConfig.Config) |
| `options?` | [`ConfigProcessOptions`](config_src#configprocessoptions) |

#### Returns

`Promise`<[`ProcessedConfig`](config_src#processedconfig)\>

#### Defined in

[packages/config/src/process.ts:74](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/process.ts#L74)

___

### resolveAdditionalTypeDefs

▸ **resolveAdditionalTypeDefs**(`baseDir`, `additionalTypeDefs`): `Promise`<`DocumentNode`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseDir` | `string` |
| `additionalTypeDefs` | `string` |

#### Returns

`Promise`<`DocumentNode`[]\>

#### Defined in

[packages/config/src/utils.ts:65](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L65)

___

### resolveCache

▸ **resolveCache**(`cacheConfig?`, `importFn`, `rootStore`, `cwd`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cacheConfig` | [`Cache`](/docs/api/interfaces/types_src.YamlConfig.Cache) |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `rootStore` | [`MeshStore`](/docs/api/classes/store_src.MeshStore) |
| `cwd` | `string` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[packages/config/src/utils.ts:78](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L78)

___

### resolveDocuments

▸ **resolveDocuments**(`documentsConfig`, `cwd`): `Promise`<`Source`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `documentsConfig` | `string`[] |
| `cwd` | `string` |

#### Returns

`Promise`<`Source`[]\>

#### Defined in

[packages/config/src/utils.ts:161](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L161)

___

### resolveLogger

▸ **resolveLogger**(`loggerConfig`, `importFn`, `cwd`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `loggerConfig` | `any` |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `cwd` | `string` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[packages/config/src/utils.ts:172](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L172)

___

### resolvePubSub

▸ **resolvePubSub**(`pubsubYamlConfig`, `importFn`, `cwd`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `pubsubYamlConfig` | `string` \| [`PubSubConfig`](/docs/api/interfaces/types_src.YamlConfig.PubSubConfig) |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `cwd` | `string` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[packages/config/src/utils.ts:111](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L111)
