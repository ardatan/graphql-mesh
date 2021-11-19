---
title: 'AddExecutionLogicToComposerOptions'
---

# Interface: AddExecutionLogicToComposerOptions

[loaders/json-schema/src](../modules/loaders_json_schema_src).AddExecutionLogicToComposerOptions

## Table of contents

### Properties

- [baseUrl](loaders_json_schema_src.AddExecutionLogicToComposerOptions#baseurl)
- [errorMessage](loaders_json_schema_src.AddExecutionLogicToComposerOptions#errormessage)
- [fetch](loaders_json_schema_src.AddExecutionLogicToComposerOptions#fetch)
- [logger](loaders_json_schema_src.AddExecutionLogicToComposerOptions#logger)
- [operationHeaders](loaders_json_schema_src.AddExecutionLogicToComposerOptions#operationheaders)
- [operations](loaders_json_schema_src.AddExecutionLogicToComposerOptions#operations)
- [pubsub](loaders_json_schema_src.AddExecutionLogicToComposerOptions#pubsub)

## Properties

### baseUrl

• **baseUrl**: `string`

#### Defined in

[packages/loaders/json-schema/src/addExecutionLogicToComposer.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/addExecutionLogicToComposer.ts#L18)

___

### errorMessage

• `Optional` **errorMessage**: `string`

#### Defined in

[packages/loaders/json-schema/src/addExecutionLogicToComposer.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/addExecutionLogicToComposer.ts#L20)

___

### fetch

• **fetch**: (`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`<`Response`\>

#### Type declaration

▸ (`input`, `init?`): `Promise`<`Response`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

`Promise`<`Response`\>

#### Defined in

[packages/loaders/json-schema/src/addExecutionLogicToComposer.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/addExecutionLogicToComposer.ts#L14)

___

### logger

• **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/loaders/json-schema/src/addExecutionLogicToComposer.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/addExecutionLogicToComposer.ts#L15)

___

### operationHeaders

• `Optional` **operationHeaders**: `Record`<`string`, `string`\>

#### Defined in

[packages/loaders/json-schema/src/addExecutionLogicToComposer.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/addExecutionLogicToComposer.ts#L17)

___

### operations

• **operations**: [`JSONSchemaOperationConfig`](../modules/loaders_json_schema_src#jsonschemaoperationconfig)[]

#### Defined in

[packages/loaders/json-schema/src/addExecutionLogicToComposer.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/addExecutionLogicToComposer.ts#L16)

___

### pubsub

• `Optional` **pubsub**: [`MeshPubSub`](types_src.MeshPubSub)

#### Defined in

[packages/loaders/json-schema/src/addExecutionLogicToComposer.ts:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/json-schema/src/addExecutionLogicToComposer.ts#L19)
