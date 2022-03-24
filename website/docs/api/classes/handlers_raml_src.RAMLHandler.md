---
title: 'RAMLHandler'
---

# Class: RAMLHandler

[handlers/raml/src](../modules/handlers_raml_src).RAMLHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_raml_src.RAMLHandler#constructor)

### Methods

- [getDereferencedBundle](handlers_raml_src.RAMLHandler#getdereferencedbundle)
- [getMeshSource](handlers_raml_src.RAMLHandler#getmeshsource)

## Constructors

### constructor

• **new RAMLHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`RAMLHandler`](/docs/api/interfaces/types_src.YamlConfig.RAMLHandler)\> |

#### Defined in

[packages/handlers/raml/src/index.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/raml/src/index.ts#L14)

## Methods

### getDereferencedBundle

▸ **getDereferencedBundle**(): `Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Returns

`Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Defined in

[packages/handlers/raml/src/index.ts:24](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/raml/src/index.ts#L24)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/raml/src/index.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/raml/src/index.ts#L40)
