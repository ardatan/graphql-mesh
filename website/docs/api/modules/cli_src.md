---
id: "cli"
title: "@graphql-mesh/cli"
sidebar_label: "cli"
---

## Table of contents

### Functions

- [findAndParseConfig](cli_src#findandparseconfig)
- [generateTsArtifacts](cli_src#generatetsartifacts)
- [graphqlMesh](cli_src#graphqlmesh)
- [serveMesh](cli_src#servemesh)

## Functions

### findAndParseConfig

▸ **findAndParseConfig**(`options?`): `Promise`<[`ProcessedConfig`](config_src#processedconfig)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | { `configName?`: `string`  } & [`ConfigProcessOptions`](config_src#configprocessoptions) |

#### Returns

`Promise`<[`ProcessedConfig`](config_src#processedconfig)\>

#### Defined in

[packages/cli/src/config.ts:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/cli/src/config.ts#L19)

___

### generateTsArtifacts

▸ **generateTsArtifacts**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.baseDir` | `string` |
| `__namedParameters.documents` | `Source`[] |
| `__namedParameters.flattenTypes` | `boolean` |
| `__namedParameters.importedModulesSet` | `Set`<`string`\> |
| `__namedParameters.logger` | [`Logger`](types_src#logger) |
| `__namedParameters.mergerType` | `string` |
| `__namedParameters.meshConfigCode` | `string` |
| `__namedParameters.rawSources` | [`RawSourceOutput`](types_src#rawsourceoutput)[] |
| `__namedParameters.sdkConfig` | [`SDKConfig`](/docs/api/interfaces/types_src.YamlConfig.SDKConfig) |
| `__namedParameters.unifiedSchema` | `GraphQLSchema` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/cli/src/commands/ts-artifacts.ts:100](https://github.com/Urigo/graphql-mesh/blob/master/packages/cli/src/commands/ts-artifacts.ts#L100)

___

### graphqlMesh

▸ **graphqlMesh**(): `Promise`<{ `$0`: `string` ; `_`: (`string` \| `number`)[] ; `port`: `number` ; `prod`: `boolean` ; `validate`: `boolean`  } \| { `$0`: `string` ; `_`: (`string` \| `number`)[] ; `port`: `number` ; `prod`: `boolean` ; `validate`: `boolean`  }\>

#### Returns

`Promise`<{ `$0`: `string` ; `_`: (`string` \| `number`)[] ; `port`: `number` ; `prod`: `boolean` ; `validate`: `boolean`  } \| { `$0`: `string` ; `_`: (`string` \| `number`)[] ; `port`: `number` ; `prod`: `boolean` ; `validate`: `boolean`  }\>

#### Defined in

[packages/cli/src/index.ts:29](https://github.com/Urigo/graphql-mesh/blob/master/packages/cli/src/index.ts#L29)

___

### serveMesh

▸ **serveMesh**(`__namedParameters`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `ServeMeshOptions` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[packages/cli/src/commands/serve/serve.ts:53](https://github.com/Urigo/graphql-mesh/blob/master/packages/cli/src/commands/serve/serve.ts#L53)
