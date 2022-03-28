---
title: 'SoapHandler'
---

# Interface: SoapHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).SoapHandler

Handler for SOAP

## Table of contents

### Properties

- [basicAuth](types_src.YamlConfig.SoapHandler#basicauth)
- [includePorts](types_src.YamlConfig.SoapHandler#includeports)
- [includeServices](types_src.YamlConfig.SoapHandler#includeservices)
- [operationHeaders](types_src.YamlConfig.SoapHandler#operationheaders)
- [schemaHeaders](types_src.YamlConfig.SoapHandler#schemaheaders)
- [securityCert](types_src.YamlConfig.SoapHandler#securitycert)
- [selectQueryOperationsAuto](types_src.YamlConfig.SoapHandler#selectqueryoperationsauto)
- [selectQueryOrMutationField](types_src.YamlConfig.SoapHandler#selectqueryormutationfield)
- [wsdl](types_src.YamlConfig.SoapHandler#wsdl)

## Properties

### basicAuth

• `Optional` **basicAuth**: [`SoapSecurityBasicAuthConfig`](types_src.YamlConfig.SoapSecurityBasicAuthConfig)

#### Defined in

[packages/types/src/config.ts:908](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L908)

___

### includePorts

• `Optional` **includePorts**: `boolean`

If true, the ports defined in the WSDL will be represented as GraphQL-Type objects in the schema.
The fields of the object will be the operations of the port.

Most soap-endpoints only define one port; so including it in the schema will just be inconvenient.
But if there are multiple ports with operations of the same name, you should set this option to true.
Otherwise only one of the identical-named operations will be callable.

default: false

#### Defined in

[packages/types/src/config.ts:931](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L931)

___

### includeServices

• `Optional` **includeServices**: `boolean`

If true, the services defined in the WSDL will be represented as GraphQL-Type objects in the schema.
The fields of the object will be the ports of the service (or the operation, dependent on 'includePorts').

Most soap-endpoints only define one service; so including it in the schema will just be inconvenient.
But if there are multiple services with operations of the same name, you should set this option to true.
Otherwise only one of the identical-named operations will be callable.

default: false

#### Defined in

[packages/types/src/config.ts:942](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L942)

___

### operationHeaders

• `Optional` **operationHeaders**: `Object`

JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:918](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L918)

___

### schemaHeaders

• `Optional` **schemaHeaders**: `any`

JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
You can also provide `.js` or `.ts` file path that exports schemaHeaders as an object

#### Defined in

[packages/types/src/config.ts:914](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L914)

___

### securityCert

• `Optional` **securityCert**: [`SoapSecurityCertificateConfig`](types_src.YamlConfig.SoapSecurityCertificateConfig)

#### Defined in

[packages/types/src/config.ts:909](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L909)

___

### selectQueryOperationsAuto

• `Optional` **selectQueryOperationsAuto**: `boolean`

Automatically put operations starts with `query` or `get` into the Query type

#### Defined in

[packages/types/src/config.ts:950](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L950)

___

### selectQueryOrMutationField

• `Optional` **selectQueryOrMutationField**: [`SoapSelectQueryOrMutationFieldConfig`](types_src.YamlConfig.SoapSelectQueryOrMutationFieldConfig)[]

Allows to explicitly override the default operation (Query or Mutation) for any SOAP operation

#### Defined in

[packages/types/src/config.ts:946](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L946)

___

### wsdl

• **wsdl**: `string`

A url to your WSDL

#### Defined in

[packages/types/src/config.ts:907](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L907)
