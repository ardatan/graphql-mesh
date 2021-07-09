import { CustomTypeResolver } from './custom-type-resolver';
import { NameResolver } from './name-resolver';
import { SoapEndpoint } from './soap-endpoint';
import { SoapCaller } from './soap-caller';
import { SchemaResolver } from './schema-resolver';
import { Logger } from '@graphql-mesh/types';
import { GraphQLSchemaConfig } from 'graphql';

/**
 * Options for the GraphQL schema.
 */
export type SchemaOptions = {
  /**
   * If true, the services defined in the WSDL will be represented as GraphQL-Type objects in the schema.
   * The fields of the object will be the ports of the service (or the operation, dependent on 'includePorts').
   *
   * Most soap-endpoints only define one service; so including it in the schema will just be inconvenient.
   * But if there are multiple services with operations of the same name, you should set this option to true.
   * Otherwise only one of the identical-named operations will be callable.
   *
   * default: false
   */
  includeServices?: boolean;

  /**
   * If true, the ports defined in the WSDL will be represented as GraphQL-Type objects in the schema.
   * The fields of the object will be the operations of the port.
   *
   * Most soap-endpoints only define one port; so including it in the schema will just be inconvenient.
   * But if there are multiple ports with operations of the same name, you should set this option to true.
   * Otherwise only one of the identical-named operations will be callable.
   *
   * default: false
   */
  includePorts?: boolean;

  /**
   * Resolver that will be used to convert WSDL types, that are not fully defined in the WSDL itself, to GraphQL types.
   * This is especially necessary for all primitive WSDL types (resp. scalar GraphQL types) like 'string', 'datetime', etc.
   *
   * You can provide your own resolver to handle custom types of your WSDL.
   * But you must still provide resolvment for primitive types like 'string', e.g by re-using DefaultTypeResolver.
   *
   * default: DefaultTypeResolver
   */
  customResolver?: CustomTypeResolver;

  /**
   * Function that proivides the name of a GraphQLOutputType.
   * The created name must be unique in the GraphQL schema!
   * (This is especially important, since SOAP allows to use the same type for input and output, but GraphQL does not)
   *
   * default: use the name of the WSDL type.
   */
  outputNameResolver?: NameResolver;
  /**
   * Function that proivides the name of a GraphQLInterfaceType.
   * The created name must be unique in the GraphQL schema!
   * (This is especially important, since SOAP allows to use the same type for input and output, but GraphQL does not)
   *
   * default: 'i' + WSDL type name.
   */
  interfaceNameResolver?: NameResolver;
  /**
   * Function that proivides the name of a GraphQLInputType.
   * The created name must be unique in the GraphQL schema!
   * (This is especially important, since SOAP allows to use the same type for input and output, but GraphQL does not)
   *
   * default: WSDL type name + 'Input'.
   */
  inputNameResolver?: NameResolver;
};

export function createSchemaConfig(
  endpoint: SoapEndpoint,
  soapCaller: SoapCaller,
  options: SchemaOptions = {},
  logger: Logger
): GraphQLSchemaConfig {
  return new SchemaResolver(endpoint, soapCaller, options, logger).resolve();
}
