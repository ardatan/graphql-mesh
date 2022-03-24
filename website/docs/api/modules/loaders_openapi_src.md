---
id: "@omnigraph_openapi"
title: "@omnigraph/openapi"
sidebar_label: "@omnigraph_openapi"
---

## Table of contents

### References

- [OpenAPILoaderBundle](loaders_openapi_src#openapiloaderbundle)
- [getGraphQLSchemaFromBundle](loaders_openapi_src#getgraphqlschemafrombundle)

### Interfaces

- [OpenAPILoaderOptions](/docs/api/interfaces/loaders_openapi_src.OpenAPILoaderOptions)

### Functions

- [createBundle](loaders_openapi_src#createbundle)
- [getJSONSchemaOptionsFromOpenAPIOptions](loaders_openapi_src#getjsonschemaoptionsfromopenapioptions)
- [loadGraphQLSchemaFromOpenAPI](loaders_openapi_src#loadgraphqlschemafromopenapi)

## References

### OpenAPILoaderBundle

Renames and re-exports [JSONSchemaLoaderBundle](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)

___

### getGraphQLSchemaFromBundle

Re-exports [getGraphQLSchemaFromBundle](loaders_json_schema_src#getgraphqlschemafrombundle)

## Functions

### createBundle

▸ **createBundle**(`name`, `openApiLoaderOptions`): `Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

Creates a bundle by downloading and resolving the internal references once
to load the schema locally later

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `openApiLoaderOptions` | [`OpenAPILoaderOptions`](/docs/api/interfaces/loaders_openapi_src.OpenAPILoaderOptions) |

#### Returns

`Promise`<[`JSONSchemaLoaderBundle`](/docs/api/interfaces/loaders_json_schema_src.JSONSchemaLoaderBundle)\>

#### Defined in

[packages/loaders/openapi/src/bundle.ts:13](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/openapi/src/bundle.ts#L13)

___

### getJSONSchemaOptionsFromOpenAPIOptions

▸ **getJSONSchemaOptionsFromOpenAPIOptions**(`__namedParameters`): `Promise`<{ `baseUrl`: `string` ; `cwd`: `string` ; `fetch`: (`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`<`Response`\> ; `operationHeaders`: `Record`<`string`, `string`\> ; `operations`: [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[] ; `schemaHeaders`: `Record`<`string`, `string`\>  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetJSONSchemaOptionsFromOpenAPIOptionsParams` |

#### Returns

`Promise`<{ `baseUrl`: `string` ; `cwd`: `string` ; `fetch`: (`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`<`Response`\> ; `operationHeaders`: `Record`<`string`, `string`\> ; `operations`: [`JSONSchemaOperationConfig`](loaders_json_schema_src#jsonschemaoperationconfig)[] ; `schemaHeaders`: `Record`<`string`, `string`\>  }\>

#### Defined in

[packages/loaders/openapi/src/getJSONSchemaOptionsFromOpenAPIOptions.ts:25](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/openapi/src/getJSONSchemaOptionsFromOpenAPIOptions.ts#L25)

___

### loadGraphQLSchemaFromOpenAPI

▸ **loadGraphQLSchemaFromOpenAPI**(`name`, `options`): `Promise`<`GraphQLSchema`\>

Creates a local GraphQLSchema instance from a OpenAPI Document.
Everytime this function is called, the OpenAPI file and its dependencies will be resolved on runtime.
If you want to avoid this, use `createBundle` function to create a bundle once and save it to a storage
then load it with `loadGraphQLSchemaFromBundle`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `options` | [`OpenAPILoaderOptions`](/docs/api/interfaces/loaders_openapi_src.OpenAPILoaderOptions) |

#### Returns

`Promise`<`GraphQLSchema`\>

#### Defined in

[packages/loaders/openapi/src/loadGraphQLSchemaFromOpenAPI.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/loaders/openapi/src/loadGraphQLSchemaFromOpenAPI.ts#L11)
