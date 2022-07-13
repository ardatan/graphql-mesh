---
id: "@omnigraph_raml"
title: "@omnigraph/raml"
sidebar_label: "@omnigraph_raml"
---

## Table of contents

### References

- [RAMLLoaderBundle](loaders_raml_src#ramlloaderbundle)
- [getGraphQLSchemaFromBundle](loaders_raml_src#getgraphqlschemafrombundle)

### Interfaces

- [RAMLLoaderOptions](/docs/api/interfaces/loaders_raml_src.RAMLLoaderOptions)

### Functions

- [createBundle](loaders_raml_src#createbundle)
- [getJSONSchemaOptionsFromRAMLOptions](loaders_raml_src#getjsonschemaoptionsfromramloptions)
- [loadGraphQLSchemaFromRAML](loaders_raml_src#loadgraphqlschemafromraml)

## References

### RAMLLoaderBundle

Renames and re-exports [JSONSchemaLoaderBundle](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)

___

### getGraphQLSchemaFromBundle

Re-exports [getGraphQLSchemaFromBundle](loaders_json_schema_src#getgraphqlschemafrombundle)

## Functions

### createBundle

▸ **createBundle**(`name`, `ramlLoaderOptions`): `Promise`\<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)>

Creates a bundle by downloading and resolving the internal references once
to load the schema locally later

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `ramlLoaderOptions` | [`RAMLLoaderOptions`](/docs/api/interfaces/loaders_raml_src.RAMLLoaderOptions) |

#### Returns

`Promise`\<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)>

___

### getJSONSchemaOptionsFromRAMLOptions

▸ **getJSONSchemaOptionsFromRAMLOptions**(`__namedParameters`): `Promise`\<\{ `baseUrl`: `string` ; `cwd`: `string` ; `fetch?`: `WindowOrWorkerGlobalScope`[``"fetch"``] ; `operations`: [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[]  }>

Generates the options for JSON Schema Loader
from RAML Loader options by extracting the JSON Schema references
from RAML API Document

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`RAMLLoaderOptions`](/docs/api/interfaces/loaders_raml_src.RAMLLoaderOptions) |

#### Returns

`Promise`\<\{ `baseUrl`: `string` ; `cwd`: `string` ; `fetch?`: `WindowOrWorkerGlobalScope`[``"fetch"``] ; `operations`: [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[]  }>

___

### loadGraphQLSchemaFromRAML

▸ **loadGraphQLSchemaFromRAML**(`name`, `options`): `Promise`\<`GraphQLSchema`>

Creates a local GraphQLSchema instance from a RAML API Document.
Everytime this function is called, the RAML file and its dependencies will be resolved on runtime.
If you want to avoid this, use `createBundle` function to create a bundle once and save it to a storage
then load it with `loadGraphQLSchemaFromBundle`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `options` | [`RAMLLoaderOptions`](/docs/api/interfaces/loaders_raml_src.RAMLLoaderOptions) |

#### Returns

`Promise`\<`GraphQLSchema`>
