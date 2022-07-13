---
title: 'GraphQLHandler'
---

# Class: GraphQLHandler

[handlers/graphql/src](../modules/handlers_graphql_src).GraphQLHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_graphql_src.GraphQLHandler#constructor)

### Methods

- [getCodeFirstSource](handlers_graphql_src.GraphQLHandler#getcodefirstsource)
- [getExecutorForHTTPSourceConfig](handlers_graphql_src.GraphQLHandler#getexecutorforhttpsourceconfig)
- [getFallbackExecutor](handlers_graphql_src.GraphQLHandler#getfallbackexecutor)
- [getMeshSource](handlers_graphql_src.GraphQLHandler#getmeshsource)
- [getNonExecutableSchemaForHTTPSource](handlers_graphql_src.GraphQLHandler#getnonexecutableschemaforhttpsource)
- [getRaceExecutor](handlers_graphql_src.GraphQLHandler#getraceexecutor)

## Constructors

### constructor

• **new GraphQLHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)\<[`GraphQLHandlerHTTPConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerHTTPConfiguration) \| [`GraphQLHandlerCodeFirstConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerCodeFirstConfiguration) \| [`GraphQLHandlerMultipleHTTPConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerMultipleHTTPConfiguration)> |

## Methods

### getCodeFirstSource

▸ **getCodeFirstSource**(`__namedParameters`): `Promise`\<[`MeshSource`](../modules/types_src#meshsource)>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GraphQLHandlerCodeFirstConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerCodeFirstConfiguration) |

#### Returns

`Promise`\<[`MeshSource`](../modules/types_src#meshsource)>

___

### getExecutorForHTTPSourceConfig

▸ **getExecutorForHTTPSourceConfig**(`httpSourceConfig`): `Promise`\<`Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `httpSourceConfig` | [`GraphQLHandlerHTTPConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerHTTPConfiguration) |

#### Returns

`Promise`\<`Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>>

___

### getFallbackExecutor

▸ **getFallbackExecutor**(`executors`): `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `executors` | `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>[] |

#### Returns

`Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>

___

### getMeshSource

▸ **getMeshSource**(): `Promise`\<[`MeshSource`](../modules/types_src#meshsource)>

#### Returns

`Promise`\<[`MeshSource`](../modules/types_src#meshsource)>

#### Implementation of

MeshHandler.getMeshSource

___

### getNonExecutableSchemaForHTTPSource

▸ **getNonExecutableSchemaForHTTPSource**(`httpSourceConfig`): `Promise`\<`GraphQLSchema`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `httpSourceConfig` | [`GraphQLHandlerHTTPConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerHTTPConfiguration) |

#### Returns

`Promise`\<`GraphQLSchema`>

___

### getRaceExecutor

▸ **getRaceExecutor**(`executors`): `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `executors` | `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>[] |

#### Returns

`Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>
