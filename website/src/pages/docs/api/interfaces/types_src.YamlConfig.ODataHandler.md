---
title: 'ODataHandler'
---

# Interface: ODataHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).ODataHandler

Handler for OData

## Table of contents

### Properties

- [baseUrl](types_src.YamlConfig.ODataHandler#baseurl)
- [batch](types_src.YamlConfig.ODataHandler#batch)
- [expandNavProps](types_src.YamlConfig.ODataHandler#expandnavprops)
- [metadata](types_src.YamlConfig.ODataHandler#metadata)
- [operationHeaders](types_src.YamlConfig.ODataHandler#operationheaders)
- [schemaHeaders](types_src.YamlConfig.ODataHandler#schemaheaders)

## Properties

### baseUrl

• **baseUrl**: `string`

Base URL for OData API

#### Defined in

[packages/types/src/config.ts:829](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L829)

___

### batch

• `Optional` **batch**: ``"json"`` \| ``"multipart"``

Enable batching (Allowed values: multipart, json)

#### Defined in

[packages/types/src/config.ts:849](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L849)

___

### expandNavProps

• `Optional` **expandNavProps**: `boolean`

Use $expand for navigation props instead of seperate HTTP requests (Default: false)

#### Defined in

[packages/types/src/config.ts:853](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L853)

___

### metadata

• `Optional` **metadata**: `string`

Custom $metadata File or URL

#### Defined in

[packages/types/src/config.ts:833](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L833)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

Headers to be used with the operation requests

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:837](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L837)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

Headers to be used with the $metadata requests

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:843](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L843)
