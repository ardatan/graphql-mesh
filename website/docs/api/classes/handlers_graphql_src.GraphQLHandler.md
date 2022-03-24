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
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)\<[`GraphQLHandlerHTTPConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerHTTPConfiguration) | [`GraphQLHandlerCodeFirstConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerCodeFirstConfiguration) | [`GraphQLHandlerMultipleHTTPConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerMultipleHTTPConfiguration)> |

#### Defined in

[packages/handlers/graphql/src/index.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L40)

## Methods

### getCodeFirstSource

▸ **getCodeFirstSource**(`__namedParameters`): `Promise`\<[`MeshSource`](../modules/types_src#meshsource)\<`any`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GraphQLHandlerCodeFirstConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerCodeFirstConfiguration) |

#### Returns

`Promise`\<[`MeshSource`](../modules/types_src#meshsource)\<`any`, `any`>>

#### Defined in

[packages/handlers/graphql/src/index.ts:161](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L161)

___

### getExecutorForHTTPSourceConfig

▸ **getExecutorForHTTPSourceConfig**(`httpSourceConfig`): `Promise`\<`Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `httpSourceConfig` | [`GraphQLHandlerHTTPConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerHTTPConfiguration) |

#### Returns

`Promise`\<`Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>>

#### Defined in

[packages/handlers/graphql/src/index.ts:58](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L58)

___

### getFallbackExecutor

▸ **getFallbackExecutor**(`executors`): `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `executors` | `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>[] |

#### Returns

`Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>

#### Defined in

[packages/handlers/graphql/src/index.ts:209](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L209)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`\<[`MeshSource`](../modules/types_src#meshsource)\<`any`, `any`>>

#### Returns

`Promise`\<[`MeshSource`](../modules/types_src#meshsource)\<`any`, `any`>>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/graphql/src/index.ts:233](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L233)

___

### getNonExecutableSchemaForHTTPSource

▸ **getNonExecutableSchemaForHTTPSource**(`httpSourceConfig`): `Promise`\<`GraphQLSchema`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `httpSourceConfig` | [`GraphQLHandlerHTTPConfiguration`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandlerHTTPConfiguration) |

#### Returns

`Promise`\<`GraphQLSchema`>

#### Defined in

[packages/handlers/graphql/src/index.ts:108](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L108)

___

### getRaceExecutor

▸ **getRaceExecutor**(`executors`): `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `executors` | `Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>[] |

#### Returns

`Executor`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>

#### Defined in

[packages/handlers/graphql/src/index.ts:203](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L203)
