---
id: "config"
title: "@graphql-mesh/config"
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
- [resolveCustomFetch](config_src#resolvecustomfetch)
- [resolveDocuments](config_src#resolvedocuments)
- [resolveLogger](config_src#resolvelogger)
- [resolvePubSub](config_src#resolvepubsub)

## Type aliases

### ConfigProcessOptions

Ƭ **ConfigProcessOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `additionalPackagePrefixes?` | `string`[] |
| `artifactsDir?` | `string` |
| `configName?` | `string` |
| `dir?` | `string` |
| `generateCode?` | `boolean` |
| `ignoreAdditionalResolvers?` | `boolean` |
| `importFn?` | [`ImportFn`](types_src#importfn) |
| `initialLoggerPrefix?` | `string` |
| `store?` | [`MeshStore`](/docs/api/classes/store_src.MeshStore) |

#### Defined in

[packages/config/src/process.ts:47](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/process.ts#L47)

___

### ProcessedConfig

Ƭ **ProcessedConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `additionalEnvelopPlugins` | `any`[] |
| `additionalResolvers` | `IResolvers`[] |
| `additionalTypeDefs` | `DocumentNode`[] |
| `cache` | [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)\<`string`> |
| `code` | `string` |
| `config` | [`Config`](/docs/api/interfaces/types_src.YamlConfig.Config) |
| `documents` | `Source`[] |
| `logger` | [`Logger`](types_src#logger) |
| `merger` | [`MeshMerger`](/docs/api/interfaces/types_src.MeshMerger) |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `sources` | [`MeshResolvedSource`](runtime_src#meshresolvedsource)[] |
| `store` | [`MeshStore`](/docs/api/classes/store_src.MeshStore) |
| `transforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/config/src/process.ts:61](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/process.ts#L61)

## Functions

### getPackage

▸ **getPackage**\<`T`>(`__namedParameters`): `Promise`\<`ResolvedPackage`\<`T`>>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetPackageOptions` |

#### Returns

`Promise`\<`ResolvedPackage`\<`T`>>

#### Defined in

[packages/config/src/utils.ts:26](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L26)

___

### processConfig

▸ **processConfig**(`config`, `options?`): `Promise`\<[`ProcessedConfig`](config_src#processedconfig)>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`Config`](/docs/api/interfaces/types_src.YamlConfig.Config) |
| `options?` | [`ConfigProcessOptions`](config_src#configprocessoptions) |

#### Returns

`Promise`\<[`ProcessedConfig`](config_src#processedconfig)>

#### Defined in

[packages/config/src/process.ts:99](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/process.ts#L99)

___

### resolveAdditionalTypeDefs

▸ **resolveAdditionalTypeDefs**(`baseDir`, `additionalTypeDefs`): `Promise`\<`DocumentNode`[]>

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseDir` | `string` |
| `additionalTypeDefs` | `string` |

#### Returns

`Promise`\<`DocumentNode`[]>

#### Defined in

[packages/config/src/utils.ts:74](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L74)

___

### resolveCache

▸ **resolveCache**(`cacheConfig?`, `importFn`, `rootStore`, `cwd`, `pubsub`, `logger`, `additionalPackagePrefixes`): `Promise`\<\{ `cache`: [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) ; `code`: `string` ; `importCode`: `string`  }>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cacheConfig` | [`Cache`](/docs/api/interfaces/types_src.YamlConfig.Cache) |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `rootStore` | [`MeshStore`](/docs/api/classes/store_src.MeshStore) |
| `cwd` | `string` |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `logger` | [`Logger`](types_src#logger) |
| `additionalPackagePrefixes` | `string`[] |

#### Returns

`Promise`\<\{ `cache`: [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) ; `code`: `string` ; `importCode`: `string`  }>

#### Defined in

[packages/config/src/utils.ts:136](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L136)

___

### resolveCustomFetch

▸ **resolveCustomFetch**(`__namedParameters`): `Promise`\<\{ `code`: `string` ; `fetchFn`: `ReturnType`\<typeof `fetchFactory`> ; `importCode`: `string`  }>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.additionalPackagePrefixes` | `string`[] |
| `__namedParameters.cache` | [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)\<`any`> |
| `__namedParameters.cwd` | `string` |
| `__namedParameters.fetchConfig?` | `string` |
| `__namedParameters.importFn` | [`ImportFn`](types_src#importfn) |

#### Returns

`Promise`\<\{ `code`: `string` ; `fetchFn`: `ReturnType`\<typeof `fetchFactory`> ; `importCode`: `string`  }>

#### Defined in

[packages/config/src/utils.ts:87](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L87)

___

### resolveDocuments

▸ **resolveDocuments**(`documentsConfig`, `cwd`): `Promise`\<`Source`[]>

#### Parameters

| Name | Type |
| :------ | :------ |
| `documentsConfig` | `string`[] |
| `cwd` | `string` |

#### Returns

`Promise`\<`Source`[]>

#### Defined in

[packages/config/src/utils.ts:238](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L238)

___

### resolveLogger

▸ **resolveLogger**(`loggerConfig`, `importFn`, `cwd`, `additionalPackagePrefixes`, `initialLoggerPrefix?`): `Promise`\<\{ `code`: `string` ; `importCode`: `string` ; `logger`: [`Logger`](types_src#logger)  }>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `loggerConfig` | `any` | `undefined` |
| `importFn` | [`ImportFn`](types_src#importfn) | `undefined` |
| `cwd` | `string` | `undefined` |
| `additionalPackagePrefixes` | `string`[] | `undefined` |
| `initialLoggerPrefix` | `string` | `'🕸️  Mesh'` |

#### Returns

`Promise`\<\{ `code`: `string` ; `importCode`: `string` ; `logger`: [`Logger`](types_src#logger)  }>

#### Defined in

[packages/config/src/utils.ts:252](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L252)

___

### resolvePubSub

▸ **resolvePubSub**(`pubsubYamlConfig`, `importFn`, `cwd`, `additionalPackagePrefixes`): `Promise`\<\{ `code`: `string` ; `importCode`: `string` ; `pubsub`: [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)  }>

#### Parameters

| Name | Type |
| :------ | :------ |
| `pubsubYamlConfig` | `string` \| [`PubSubConfig`](/docs/api/interfaces/types_src.YamlConfig.PubSubConfig) |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `cwd` | `string` |
| `additionalPackagePrefixes` | `string`[] |

#### Returns

`Promise`\<\{ `code`: `string` ; `importCode`: `string` ; `pubsub`: [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)  }>

#### Defined in

[packages/config/src/utils.ts:186](https://github.com/Urigo/graphql-mesh/blob/master/packages/config/src/utils.ts#L186)
