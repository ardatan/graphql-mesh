---
title: 'ODataHandler'
---

# Class: ODataHandler

[handlers/odata/src](../modules/handlers_odata_src).ODataHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_odata_src.ODataHandler#constructor)

### Methods

- [getCachedMetadataJson](handlers_odata_src.ODataHandler#getcachedmetadatajson)
- [getMeshSource](handlers_odata_src.ODataHandler#getmeshsource)

## Constructors

### constructor

• **new ODataHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`ODataHandler`](/docs/api/interfaces/types_src.YamlConfig.ODataHandler)\> |

## Methods

### getCachedMetadataJson

▸ **getCachedMetadataJson**(): `Promise`<`any`\>

#### Returns

`Promise`<`any`\>

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)\>

#### Implementation of

MeshHandler.getMeshSource
