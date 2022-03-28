---
title: 'ReadFileOrUrlOptions'
---

# Interface: ReadFileOrUrlOptions

[utils/src](../modules/utils_src).ReadFileOrUrlOptions

## Hierarchy

- `RequestInit`

  ↳ **`ReadFileOrUrlOptions`**

## Table of contents

### Properties

- [allowUnknownExtensions](utils_src.ReadFileOrUrlOptions#allowunknownextensions)
- [body](utils_src.ReadFileOrUrlOptions#body)
- [cache](utils_src.ReadFileOrUrlOptions#cache)
- [credentials](utils_src.ReadFileOrUrlOptions#credentials)
- [cwd](utils_src.ReadFileOrUrlOptions#cwd)
- [fallbackFormat](utils_src.ReadFileOrUrlOptions#fallbackformat)
- [fetch](utils_src.ReadFileOrUrlOptions#fetch)
- [headers](utils_src.ReadFileOrUrlOptions#headers)
- [importFn](utils_src.ReadFileOrUrlOptions#importfn)
- [integrity](utils_src.ReadFileOrUrlOptions#integrity)
- [keepalive](utils_src.ReadFileOrUrlOptions#keepalive)
- [logger](utils_src.ReadFileOrUrlOptions#logger)
- [method](utils_src.ReadFileOrUrlOptions#method)
- [mode](utils_src.ReadFileOrUrlOptions#mode)
- [redirect](utils_src.ReadFileOrUrlOptions#redirect)
- [referrer](utils_src.ReadFileOrUrlOptions#referrer)
- [referrerPolicy](utils_src.ReadFileOrUrlOptions#referrerpolicy)
- [signal](utils_src.ReadFileOrUrlOptions#signal)
- [window](utils_src.ReadFileOrUrlOptions#window)

## Properties

### allowUnknownExtensions

• `Optional` **allowUnknownExtensions**: `boolean`

#### Defined in

[packages/utils/src/read-file-or-url.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L13)

___

### body

• `Optional` **body**: `BodyInit`

A BodyInit object or null to set request's body.

#### Inherited from

RequestInit.body

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1498

___

### cache

• `Optional` **cache**: `RequestCache`

A string indicating how the request will interact with the browser's cache to set request's cache.

#### Inherited from

RequestInit.cache

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1500

___

### credentials

• `Optional` **credentials**: `RequestCredentials`

A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.

#### Inherited from

RequestInit.credentials

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1502

___

### cwd

• `Optional` **cwd**: `string`

#### Defined in

[packages/utils/src/read-file-or-url.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L15)

___

### fallbackFormat

• `Optional` **fallbackFormat**: ``"json"`` \| ``"yaml"`` \| ``"js"`` \| ``"ts"``

#### Defined in

[packages/utils/src/read-file-or-url.ts:14](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L14)

___

### fetch

• `Optional` **fetch**: (`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`\<`Response`>

#### Type declaration

▸ (`input`, `init?`): `Promise`\<`Response`>

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

`Promise`\<`Response`>

#### Defined in

[packages/utils/src/read-file-or-url.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L16)

___

### headers

• `Optional` **headers**: `HeadersInit`

A Headers object, an object literal, or an array of two-item arrays to set request's headers.

#### Inherited from

RequestInit.headers

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1504

___

### importFn

• `Optional` **importFn**: [`ImportFn`](../modules/types_src#importfn)

#### Defined in

[packages/utils/src/read-file-or-url.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L17)

___

### integrity

• `Optional` **integrity**: `string`

A cryptographic hash of the resource to be fetched by request. Sets request's integrity.

#### Inherited from

RequestInit.integrity

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1506

___

### keepalive

• `Optional` **keepalive**: `boolean`

A boolean to set request's keepalive.

#### Inherited from

RequestInit.keepalive

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1508

___

### logger

• `Optional` **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/utils/src/read-file-or-url.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L18)

___

### method

• `Optional` **method**: `string`

A string to set request's method.

#### Inherited from

RequestInit.method

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1510

___

### mode

• `Optional` **mode**: `RequestMode`

A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.

#### Inherited from

RequestInit.mode

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1512

___

### redirect

• `Optional` **redirect**: `RequestRedirect`

A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.

#### Inherited from

RequestInit.redirect

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1514

___

### referrer

• `Optional` **referrer**: `string`

A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.

#### Inherited from

RequestInit.referrer

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1516

___

### referrerPolicy

• `Optional` **referrerPolicy**: `ReferrerPolicy`

A referrer policy to set request's referrerPolicy.

#### Inherited from

RequestInit.referrerPolicy

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1518

___

### signal

• `Optional` **signal**: `AbortSignal`

An AbortSignal to set request's signal.

#### Inherited from

RequestInit.signal

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1520

___

### window

• `Optional` **window**: ``null``

Can only be null. Used to disassociate request from any Window.

#### Inherited from

RequestInit.window

#### Defined in

node_modules/typescript/lib/lib.dom.d.ts:1522
