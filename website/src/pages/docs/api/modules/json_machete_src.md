---
id: "json-machete"
title: "json-machete"
---

## Table of contents

### Enumerations

- [OnCircularReference](/docs/api/enums/json_machete_src.OnCircularReference)

### Interfaces

- [JSONSchemaObject](/docs/api/interfaces/json_machete_src.JSONSchemaObject)
- [JSONSchemaVisitorContext](/docs/api/interfaces/json_machete_src.JSONSchemaVisitorContext)

### Type aliases

- [JSONSchema](json_machete_src#jsonschema)

### Variables

- [FIRST\_VISITED\_PATH](json_machete_src#first_visited_path)

### Functions

- [compareJSONSchemas](json_machete_src#comparejsonschemas)
- [dereferenceObject](json_machete_src#dereferenceobject)
- [getAbsolutePath](json_machete_src#getabsolutepath)
- [getCwd](json_machete_src#getcwd)
- [healJSONSchema](json_machete_src#healjsonschema)
- [referenceJSONSchema](json_machete_src#referencejsonschema)
- [resolvePath](json_machete_src#resolvepath)
- [visitJSONSchema](json_machete_src#visitjsonschema)

## Type aliases

### JSONSchema

Ƭ **JSONSchema**: [`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject) \| `JSONSchemaBoolean`

**`default`** \{}

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:119

## Variables

### FIRST\_VISITED\_PATH

• `Const` **FIRST\_VISITED\_PATH**: typeof [`FIRST_VISITED_PATH`](json_machete_src#first_visited_path)

#### Defined in

[packages/json-machete/src/visitJSONSchema.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/visitJSONSchema.ts#L17)

## Functions

### compareJSONSchemas

▸ **compareJSONSchemas**(`oldSchema`, `newSchema`): `Promise`\<`void`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `oldSchema` | [`JSONSchema`](json_machete_src#jsonschema) |
| `newSchema` | [`JSONSchema`](json_machete_src#jsonschema) |

#### Returns

`Promise`\<`void`>

#### Defined in

[packages/json-machete/src/compareJSONSchemas.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/compareJSONSchemas.ts#L7)

___

### dereferenceObject

▸ **dereferenceObject**\<`T`, `TRoot`>(`obj`, `__namedParameters?`): `Promise`\<`T`>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `object` |
| `TRoot` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `T` |
| `__namedParameters` | `Object` |
| `__namedParameters.cwd?` | `string` |
| `__namedParameters.externalFileCache?` | `Map`\<`string`, `any`> |
| `__namedParameters.fetchFn?` | (`input`: `URL` \| `RequestInfo`, `init?`: `RequestInit`) => `Promise`\<`Response`> |
| `__namedParameters.headers?` | `Record`\<`string`, `string`> |
| `__namedParameters.logger?` | `any` |
| `__namedParameters.refMap?` | `Map`\<`string`, `any`> |
| `__namedParameters.root?` | `TRoot` |
| `__namedParameters.importFn?` | (`m`: `string`) => `any` |

#### Returns

`Promise`\<`T`>

#### Defined in

[packages/json-machete/src/dereferenceObject.ts:66](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/dereferenceObject.ts#L66)

___

### getAbsolutePath

▸ **getAbsolutePath**(`path`, `cwd`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `cwd` | `string` |

#### Returns

`string`

#### Defined in

[packages/json-machete/src/dereferenceObject.ts:48](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/dereferenceObject.ts#L48)

___

### getCwd

▸ **getCwd**(`path`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`string`

#### Defined in

[packages/json-machete/src/dereferenceObject.ts:61](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/dereferenceObject.ts#L61)

___

### healJSONSchema

▸ **healJSONSchema**(`schema`, `options?`): `Promise`\<[`JSONSchema`](json_machete_src#jsonschema)>

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`JSONSchema`](json_machete_src#jsonschema) |
| `options` | `Object` |
| `options.noDeduplication?` | `boolean` |

#### Returns

`Promise`\<[`JSONSchema`](json_machete_src#jsonschema)>

#### Defined in

[packages/json-machete/src/healJSONSchema.ts:73](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/healJSONSchema.ts#L73)

___

### referenceJSONSchema

▸ **referenceJSONSchema**(`schema`): `Promise`\<`any`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`JSONSchemaObject`](/docs/api/interfaces/json_machete_src.JSONSchemaObject) |

#### Returns

`Promise`\<`any`>

#### Defined in

[packages/json-machete/src/referenceJSONSchema.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/referenceJSONSchema.ts#L5)

___

### resolvePath

▸ **resolvePath**(`path`, `root`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `root` | `any` |

#### Returns

`any`

#### Defined in

[packages/json-machete/src/dereferenceObject.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/dereferenceObject.ts#L7)

___

### visitJSONSchema

▸ **visitJSONSchema**\<`T`>(`schema`, `visitorFn`, `__namedParameters?`): `Promise`\<`any`>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`JSONSchema`](json_machete_src#jsonschema) |
| `visitorFn` | (`subSchema`: [`JSONSchema`](json_machete_src#jsonschema), `context`: [`JSONSchemaVisitorContext`](/docs/api/interfaces/json_machete_src.JSONSchemaVisitorContext)\<`T`>) => `T` \| `Promise`\<`T`> |
| `__namedParameters` | [`JSONSchemaVisitorContext`](/docs/api/interfaces/json_machete_src.JSONSchemaVisitorContext)\<`T`> |

#### Returns

`Promise`\<`any`>

#### Defined in

[packages/json-machete/src/visitJSONSchema.ts:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/visitJSONSchema.ts#L19)
