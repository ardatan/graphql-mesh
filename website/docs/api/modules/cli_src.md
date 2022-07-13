---
id: "cli"
title: "@graphql-mesh/cli"
sidebar_label: "cli"
---

## Table of contents

### Interfaces

- [GraphQLMeshCLIParams](/docs/api/interfaces/cli_src.GraphQLMeshCLIParams)

### Variables

- [DEFAULT\_CLI\_PARAMS](cli_src#default_cli_params)

### Functions

- [findAndParseConfig](cli_src#findandparseconfig)
- [generateTsArtifacts](cli_src#generatetsartifacts)
- [graphqlMesh](cli_src#graphqlmesh)
- [serveMesh](cli_src#servemesh)

## Variables

### DEFAULT\_CLI\_PARAMS

• `Const` **DEFAULT\_CLI\_PARAMS**: [`GraphQLMeshCLIParams`](/docs/api/interfaces/cli_src.GraphQLMeshCLIParams)

#### Defined in

[packages/cli/src/index.ts:44](https://github.com/Urigo/graphql-mesh/blob/master/packages/cli/src/index.ts#L44)

## Functions

### findAndParseConfig

▸ **findAndParseConfig**(`options?`): `Promise`<[`ProcessedConfig`](config_src#processedconfig)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`ConfigProcessOptions`](config_src#configprocessoptions) |

#### Returns

`Promise`<[`ProcessedConfig`](config_src#processedconfig)\>

___

### generateTsArtifacts

▸ **generateTsArtifacts**(`__namedParameters`, `cliParams`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.baseDir` | `string` |
| `__namedParameters.codegenConfig` | `any` |
| `__namedParameters.documents` | `Source`[] |
| `__namedParameters.fileType` | ``"json"`` \| ``"js"`` \| ``"ts"`` |
| `__namedParameters.flattenTypes` | `boolean` |
| `__namedParameters.importedModulesSet` | `Set`<`string`\> |
| `__namedParameters.logger` | [`Logger`](types_src#logger) |
| `__namedParameters.mergerType` | `string` |
| `__namedParameters.meshConfigCode` | `string` |
| `__namedParameters.rawSources` | readonly [`RawSourceOutput`](types_src#rawsourceoutput)[] |
| `__namedParameters.sdkConfig` | [`SDKConfig`](/docs/api/interfaces/types_src.YamlConfig.SDKConfig) |
| `__namedParameters.unifiedSchema` | `GraphQLSchema` |
| `cliParams` | [`GraphQLMeshCLIParams`](/docs/api/interfaces/cli_src.GraphQLMeshCLIParams) |

#### Returns

`Promise`<`void`\>

___

### graphqlMesh

▸ **graphqlMesh**(`cliParams?`, `args?`, `cwdPath?`): `Promise`<{ `$0`: `string` ; `_`: (`string` \| `number`)[] ; `source`: `string`  } \| { `$0`: `string` ; `_`: (`string` \| `number`)[] ; `source`: `string`  }\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `cliParams` | [`GraphQLMeshCLIParams`](/docs/api/interfaces/cli_src.GraphQLMeshCLIParams) | `DEFAULT_CLI_PARAMS` |
| `args` | `string`[] | `undefined` |
| `cwdPath` | `string` | `undefined` |

#### Returns

`Promise`<{ `$0`: `string` ; `_`: (`string` \| `number`)[] ; `source`: `string`  } \| { `$0`: `string` ; `_`: (`string` \| `number`)[] ; `source`: `string`  }\>

___

### serveMesh

▸ **serveMesh**(`__namedParameters`, `cliParams`): `Promise`<{ `app`: `Express` ; `httpServer`: `Server` ; `logger`: [`Logger`](types_src#logger) ; `mesh`: [`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance) ; `readyFlag`: `boolean`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ServeMeshOptions`](/docs/api/interfaces/runtime_src.ServeMeshOptions) |
| `cliParams` | [`GraphQLMeshCLIParams`](/docs/api/interfaces/cli_src.GraphQLMeshCLIParams) |

#### Returns

`Promise`<{ `app`: `Express` ; `httpServer`: `Server` ; `logger`: [`Logger`](types_src#logger) ; `mesh`: [`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance) ; `readyFlag`: `boolean`  }\>
