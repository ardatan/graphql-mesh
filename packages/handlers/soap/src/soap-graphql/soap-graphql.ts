import { NodeSoapClient, NodeSoapOptions, createSoapClient } from './node-soap/node-soap';
import { SchemaOptions, createSchemaConfig } from './soap2graphql/soap2graphql';
import { SoapCaller } from './soap2graphql/soap-caller';
import { SoapEndpoint } from './soap2graphql/soap-endpoint';
import { createSoapEndpoint } from './node-soap/node-soap-endpoint';
import { NodeSoapCaller } from './node-soap/node-soap-caller';
import { Logger } from '@graphql-mesh/types';
import { GraphQLSchema, GraphQLSchemaConfig } from 'graphql';

export type SoapGraphqlOptions = {
  /**
   * node-soap client to use.
   * Either this field or 'createClient' must be filled.
   */
  soapClient?: NodeSoapClient;
  /**
   * Creation parameters for a node-soap client.
   * Will only be used if 'soapClient' is empty.
   * Either this field or 'soapClient' must be filled.
   */
  createClient?: {
    url: string;
    options?: NodeSoapOptions;
  };
  /**
   * Options for the GraphQL schema.
   */
  schemaOptions?: SchemaOptions;
  /**
   * Handler for executing a soap call based on input from GraphQL.
   * Use this, if request do need pre-processing (resp.: responses need post-processing) before execution.
   *
   * default: NodeSoapCaller
   */
  soapCaller?: SoapCaller;

  /**
   * If set to true, (a lot of) debug-information will be dumped to console.log
   * Do not use this in production!
   *
   * default: false
   */
  debug?: boolean;
  /**
   * If set to true, warnings will be printed to console.log
   * A warning means: The GraphQL schema can be generated, but it might not work as intended.
   *
   * default: false
   */
  warnings?: boolean;
  logger: Logger;
};

/**
 * Creates a GraphQL schema for the WSDL defined by the given parameters.
 *
 * The created GraphQL schema will include:
 * - A Mutation-field for every operation in the WSDL.
 * If the field is queried via GraphQL, the SOAP endpoint declared in the WSDL will be called and the result of the call will be returned via GraphQL.
 * - A GraphQL output type for every WSDL type that is: a) used as a result of an operation and b) declared in the schema section of the WSDL.
 * - A GraphQL interface type for every WSDL type that is: a) used as a base type of another type and b) declared in the schema section of the WSDL.
 * - A GraphQL input type for every WSDL type that is: a) used as a input type of an operation and b) declared in the schema section of the WSDL.
 * - A Query-field that returns the content of the WSDL (this is necessary, since a GraphQL schema must include at least one Query-field)
 *
 * @param options either an instance of SoapGraphQLOptions or the URL (http/https or path to a file) to a WSDL.
 */
export async function soapGraphqlSchema(options: SoapGraphqlOptions): Promise<GraphQLSchema> {
  return new GraphQLSchema(await soapGraphqlSchemaConfig(options));
}

export async function soapGraphqlSchemaConfig(options: SoapGraphqlOptions): Promise<GraphQLSchemaConfig> {
  const soapClient: NodeSoapClient = await useSoapClient(options);
  const wsdl: SoapEndpoint = await createSoapEndpoint(soapClient, options.logger);

  if (!options.soapCaller) {
    options.soapCaller = new NodeSoapCaller(soapClient, options.logger);
  }

  return createSchemaConfig(wsdl, options.soapCaller, options.schemaOptions, options.logger);
}

async function useSoapClient(options: SoapGraphqlOptions): Promise<NodeSoapClient> {
  if (options.soapClient) {
    return options.soapClient;
  }
  if (options.createClient) {
    return createSoapClient(options.createClient.url, options.createClient.options);
  }
  throw new Error('neither soap client nor node-soap creation options provided');
}
