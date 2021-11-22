---
title: 'JSONSchemaVisitorContext'
---

# Interface: JSONSchemaVisitorContext<T\>

[json-machete/src](../modules/json_machete_src).JSONSchemaVisitorContext

## Type parameters

| Name |
| :------ |
| `T` |

## Table of contents

### Properties

- [keepObjectRef](json_machete_src.JSONSchemaVisitorContext#keepobjectref)
- [onCircularReference](json_machete_src.JSONSchemaVisitorContext#oncircularreference)
- [path](json_machete_src.JSONSchemaVisitorContext#path)
- [visitedSubschemaResultMap](json_machete_src.JSONSchemaVisitorContext#visitedsubschemaresultmap)

## Properties

### keepObjectRef

• **keepObjectRef**: `boolean`

#### Defined in

[packages/json-machete/src/visitJSONSchema.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/visitJSONSchema.ts#L12)

___

### onCircularReference

• **onCircularReference**: [`OnCircularReference`](/docs/api/enums/json_machete_src.OnCircularReference)

#### Defined in

[packages/json-machete/src/visitJSONSchema.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/visitJSONSchema.ts#L13)

___

### path

• **path**: `string`

#### Defined in

[packages/json-machete/src/visitJSONSchema.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/visitJSONSchema.ts#L11)

___

### visitedSubschemaResultMap

• **visitedSubschemaResultMap**: `WeakMap`<[`JSONSchemaObject`](json_machete_src.JSONSchemaObject), `T`\>

#### Defined in

[packages/json-machete/src/visitJSONSchema.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/json-machete/src/visitJSONSchema.ts#L10)
