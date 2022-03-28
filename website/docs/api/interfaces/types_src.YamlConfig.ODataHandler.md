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
- [customFetch](types_src.YamlConfig.ODataHandler#customfetch)
- [expandNavProps](types_src.YamlConfig.ODataHandler#expandnavprops)
- [metadata](types_src.YamlConfig.ODataHandler#metadata)
- [operationHeaders](types_src.YamlConfig.ODataHandler#operationheaders)
- [schemaHeaders](types_src.YamlConfig.ODataHandler#schemaheaders)

## Properties

### baseUrl

• **baseUrl**: `string`

Base URL for OData API

#### Defined in

[packages/types/src/config.ts:724](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L724)

___

### batch

• `Optional` **batch**: ``"json"`` \| ``"multipart"``

Enable batching (Allowed values: multipart, json)

#### Defined in

[packages/types/src/config.ts:744](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L744)

___

### customFetch

• `Optional` **customFetch**: `any`

Custom Fetch

#### Defined in

[packages/types/src/config.ts:752](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L752)

___

### expandNavProps

• `Optional` **expandNavProps**: `boolean`

Use $expand for navigation props instead of seperate HTTP requests (Default: false)

#### Defined in

[packages/types/src/config.ts:748](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L748)

___

### metadata

• `Optional` **metadata**: `string`

Custom $metadata File or URL

#### Defined in

[packages/types/src/config.ts:728](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L728)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

Headers to be used with the operation requests

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:732](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L732)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `Object`

Headers to be used with the $metadata requests

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:738](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L738)
