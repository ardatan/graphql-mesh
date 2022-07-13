---
title: 'JSONSchemaObject'
---

# Interface: JSONSchemaObject

[json-machete/src](../modules/json_machete_src).JSONSchemaObject

## Indexable

▪ [k: `string`]: `any`

## Table of contents

### Properties

- [$comment](json_machete_src.JSONSchemaObject#$comment)
- [$id](json_machete_src.JSONSchemaObject#$id)
- [$ref](json_machete_src.JSONSchemaObject#$ref)
- [$schema](json_machete_src.JSONSchemaObject#$schema)
- [additionalItems](json_machete_src.JSONSchemaObject#additionalitems)
- [additionalProperties](json_machete_src.JSONSchemaObject#additionalproperties)
- [allOf](json_machete_src.JSONSchemaObject#allof)
- [anyOf](json_machete_src.JSONSchemaObject#anyof)
- [const](json_machete_src.JSONSchemaObject#const)
- [contains](json_machete_src.JSONSchemaObject#contains)
- [contentEncoding](json_machete_src.JSONSchemaObject#contentencoding)
- [contentMediaType](json_machete_src.JSONSchemaObject#contentmediatype)
- [default](json_machete_src.JSONSchemaObject#default)
- [definitions](json_machete_src.JSONSchemaObject#definitions)
- [dependencies](json_machete_src.JSONSchemaObject#dependencies)
- [description](json_machete_src.JSONSchemaObject#description)
- [else](json_machete_src.JSONSchemaObject#else)
- [enum](json_machete_src.JSONSchemaObject#enum)
- [examples](json_machete_src.JSONSchemaObject#examples)
- [exclusiveMaximum](json_machete_src.JSONSchemaObject#exclusivemaximum)
- [exclusiveMinimum](json_machete_src.JSONSchemaObject#exclusiveminimum)
- [format](json_machete_src.JSONSchemaObject#format)
- [if](json_machete_src.JSONSchemaObject#if)
- [items](json_machete_src.JSONSchemaObject#items)
- [maxItems](json_machete_src.JSONSchemaObject#maxitems)
- [maxLength](json_machete_src.JSONSchemaObject#maxlength)
- [maxProperties](json_machete_src.JSONSchemaObject#maxproperties)
- [maximum](json_machete_src.JSONSchemaObject#maximum)
- [minItems](json_machete_src.JSONSchemaObject#minitems)
- [minLength](json_machete_src.JSONSchemaObject#minlength)
- [minProperties](json_machete_src.JSONSchemaObject#minproperties)
- [minimum](json_machete_src.JSONSchemaObject#minimum)
- [multipleOf](json_machete_src.JSONSchemaObject#multipleof)
- [not](json_machete_src.JSONSchemaObject#not)
- [oneOf](json_machete_src.JSONSchemaObject#oneof)
- [pattern](json_machete_src.JSONSchemaObject#pattern)
- [patternProperties](json_machete_src.JSONSchemaObject#patternproperties)
- [properties](json_machete_src.JSONSchemaObject#properties)
- [propertyNames](json_machete_src.JSONSchemaObject#propertynames)
- [readOnly](json_machete_src.JSONSchemaObject#readonly)
- [required](json_machete_src.JSONSchemaObject#required)
- [then](json_machete_src.JSONSchemaObject#then)
- [title](json_machete_src.JSONSchemaObject#title)
- [type](json_machete_src.JSONSchemaObject#type)
- [uniqueItems](json_machete_src.JSONSchemaObject#uniqueitems)

## Properties

### $comment

• `Optional` **$comment**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:64

___

### $id

• `Optional` **$id**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:61

___

### $ref

• `Optional` **$ref**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:63

___

### $schema

• `Optional` **$schema**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:62

___

### additionalItems

• `Optional` **additionalItems**: [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:78

___

### additionalProperties

• `Optional` **additionalProperties**: [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:87

___

### allOf

• `Optional` **allOf**: `SchemaArray`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:102

___

### anyOf

• `Optional` **anyOf**: `SchemaArray`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:103

___

### const

• `Optional` **const**: `any`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:93

___

### contains

• `Optional` **contains**: [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:83

___

### contentEncoding

• `Optional` **contentEncoding**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:98

___

### contentMediaType

• `Optional` **contentMediaType**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:97

___

### default

• `Optional` **default**: `any`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:67

___

### definitions

• `Optional` **definitions**: `Definitions`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:88

___

### dependencies

• `Optional` **dependencies**: `Dependencies`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:91

___

### description

• `Optional` **description**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:66

___

### else

• `Optional` **else**: [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:101

___

### enum

• `Optional` **enum**: `Enum`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:94

___

### examples

• `Optional` **examples**: `Examples`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:69

___

### exclusiveMaximum

• `Optional` **exclusiveMaximum**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:72

___

### exclusiveMinimum

• `Optional` **exclusiveMinimum**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:74

___

### format

• `Optional` **format**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:96

___

### if

• `Optional` **if**: [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:99

___

### items

• `Optional` **items**: `Items`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:79

___

### maxItems

• `Optional` **maxItems**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:80

___

### maxLength

• `Optional` **maxLength**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:75

___

### maxProperties

• `Optional` **maxProperties**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:84

___

### maximum

• `Optional` **maximum**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:71

___

### minItems

• `Optional` **minItems**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:81

___

### minLength

• `Optional` **minLength**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:76

___

### minProperties

• `Optional` **minProperties**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:85

___

### minimum

• `Optional` **minimum**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:73

___

### multipleOf

• `Optional` **multipleOf**: `number`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:70

___

### not

• `Optional` **not**: [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:105

___

### oneOf

• `Optional` **oneOf**: `SchemaArray`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:104

___

### pattern

• `Optional` **pattern**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:77

___

### patternProperties

• `Optional` **patternProperties**: `PatternProperties`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:90

___

### properties

• `Optional` **properties**: `Properties`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:89

___

### propertyNames

• `Optional` **propertyNames**: [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:92

___

### readOnly

• `Optional` **readOnly**: `boolean`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:68

___

### required

• `Optional` **required**: `StringArray`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:86

___

### then

• `Optional` **then**: [`JSONSchema`](../modules/json_machete_src#jsonschema)

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:100

___

### title

• `Optional` **title**: `string`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:65

___

### type

• `Optional` **type**: `Type`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:95

___

### uniqueItems

• `Optional` **uniqueItems**: `boolean`

#### Defined in

node_modules/@json-schema-tools/meta-schema/index.d.ts:82
