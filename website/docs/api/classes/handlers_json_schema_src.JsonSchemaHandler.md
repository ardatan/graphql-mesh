---
title: 'JsonSchemaHandler'
---

# Class: JsonSchemaHandler

[handlers/json-schema/src](../modules/handlers_json_schema_src).JsonSchemaHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_json_schema_src.JsonSchemaHandler#constructor)

### Properties

- [cache](handlers_json_schema_src.JsonSchemaHandler#cache)
- [jsonSchema](handlers_json_schema_src.JsonSchemaHandler#jsonschema)
- [pubsub](handlers_json_schema_src.JsonSchemaHandler#pubsub)

### Methods

- [getDereferencedSchema](handlers_json_schema_src.JsonSchemaHandler#getdereferencedschema)
- [getMeshSource](handlers_json_schema_src.JsonSchemaHandler#getmeshsource)

## Constructors

### constructor

• **new JsonSchemaHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`JsonSchemaHandler`](/docs/api/interfaces/types_src.YamlConfig.JsonSchemaHandler)\> |

#### Defined in

[packages/handlers/json-schema/src/index.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L20)

## Properties

### cache

• **cache**: [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)<`any`\>

#### Defined in

[packages/handlers/json-schema/src/index.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L14)

___

### jsonSchema

• **jsonSchema**: [`StoreProxy`](../modules/store_src#storeproxy)<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Defined in

[packages/handlers/json-schema/src/index.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L16)

___

### pubsub

• **pubsub**: [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)

#### Defined in

[packages/handlers/json-schema/src/index.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L15)

## Methods

### getDereferencedSchema

▸ **getDereferencedSchema**(): `Promise`<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Returns

`Promise`<[`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject)\>

#### Defined in

[packages/handlers/json-schema/src/index.ts:30](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L30)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<`Object`\>

#### Returns

`Promise`<`Object`\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/json-schema/src/index.ts:50](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/src/index.ts#L50)
