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

[packages/types/src/config.ts:831](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L831)

___

### batch

• `Optional` **batch**: ``"json"`` \| ``"multipart"``

Enable batching (Allowed values: multipart, json)

#### Defined in

[packages/types/src/config.ts:851](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L851)

___

### expandNavProps

• `Optional` **expandNavProps**: `boolean`

Use $expand for navigation props instead of seperate HTTP requests (Default: false)

#### Defined in

[packages/types/src/config.ts:855](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L855)

___

### metadata

• `Optional` **metadata**: `string`

Custom $metadata File or URL

#### Defined in

[packages/types/src/config.ts:835](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L835)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

Headers to be used with the operation requests

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:839](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L839)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

Headers to be used with the $metadata requests

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:845](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L845)
