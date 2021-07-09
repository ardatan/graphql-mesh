// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

// Type imports:
import { GraphQLOperationType, SubscriptionContext } from './graphql';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { ResolverMiddleware } from '../resolver_builder';
import { Logger, MeshPubSub } from '@graphql-mesh/types';

/**
 * Type definition of the options that users can pass to OpenAPI-to-GraphQL.
 */
export type Warning = {
  type: string;
  message: string;
  mitigation: string;
  path?: string[];
};

export type Report = {
  warnings: Warning[];
  numOps: number;
  numOpsQuery: number;
  numOpsMutation: number;
  numOpsSubscription: number;
  numQueriesCreated: number;
  numMutationsCreated: number;
  numSubscriptionsCreated: number;
};

export type ConnectOptions = {
  [key: string]: boolean | number | string;
};

// A standardized type that can be used to identify a specific operation in an OAS
export type OasTitlePathMethodObject<T> = {
  [title: string]: {
    [path: string]: {
      [method: string]: T;
    };
  };
};

export type Headers = { [key: string]: string };

/**
 * Given a set parameters corresponding to a specific operation in the OAS,
 * provide the appropriate headers
 */
export type RequestHeadersFunction<TSource, TContext, TArgs> = (
  method: string,
  path: string,
  title: string,
  resolverParams?: {
    source: TSource;
    args: TArgs;
    context: TContext;
    info: GraphQLResolveInfo;
  }
) => Headers;

/*
export type RequestOptions<TSource, TContext, TArgs> = Omit<
  RequestInit,
  'headers'
> & {
  headers?: Headers | RequestHeadersFunction<TSource, TContext, TArgs>
}
*/
export type RequestOptions<TSource, TContext, TArgs> = RequestInit;
export type Options<TSource, TContext, TArgs> = Partial<InternalOptions<TSource, TContext, TArgs>>;

export type InternalOptions<TSource, TContext, TArgs> = {
  /*
   * Adhere to the OAS as closely as possible. If set to true, any deviation
   * from the OAS will lead OpenAPI-to-GraphQL to throw.
   */
  strict: boolean;

  /**
   * Holds information about the GraphQL schema generation process
   */
  report: Report;

  // Schema options

  /**
   * Field names can only be sanitized operationIds
   *
   * By default, query field names are based on the return type type name and
   * mutation field names are based on the operationId, which may be generated
   * if it does not exist.
   *
   * This option forces OpenAPI-to-GraphQL to only create field names based on the
   * operationId.
   */
  operationIdFieldNames: boolean;

  /**
   * Under certain circumstances (such as response code 204), some RESTful
   * operations should not return any data. However, GraphQL objects must have
   * a data structure. Normally, these operations would be ignored but for the
   * sake of completeness, the following option will give these operations a
   * placeholder data structure. Even though the data structure will not have
   * any practical use, at least the operations will show up in the schema.
   */
  fillEmptyResponses: boolean;

  /**
   * Auto-generate a 'limit' argument for all fields that return lists of
   * objects, including ones produced by links
   *
   * Allows to constrain the return size of lists of objects
   *
   * Returns the first n number of elements in the list
   */
  addLimitArgument: boolean;

  /**
   * If a schema is of type string and has format UUID, it will be translated
   * into a GraphQL ID type. To allow for more customzation, this option allows
   * users to specify other formats that should be interpreted as ID types.
   */
  idFormats?: string[];

  /**
   * Allows to define the root operation type (Query or Mutation type) of any
   * OAS operation explicitly.
   *
   * OpenAPI-to-GraphQL will by default make all GET operations Query fields and all other
   * operations into Mutation fields.
   *
   * The field is identifed first by the title of the OAS, then the path of the
   * operation, and lastly the method of the operation.
   */
  selectQueryOrMutationField?: OasTitlePathMethodObject<GraphQLOperationType>;

  /**
   * Sets argument name for the payload of a mutation to 'requestBody'
   */
  genericPayloadArgName: boolean;

  /**
   * By default, field names are sanitized to conform with GraphQL conventions,
   * i.e. types should be in PascalCase, fields should be in camelCase, and
   * enum values should be in ALL_CAPS.
   *
   * This option will prevent OpenAPI-to-GraphQL from enforcing camelCase field names and
   * PascalCase type names, only removing illegal characters and staying as true
   * to the provided names in the OAS as possible.
   */
  simpleNames: boolean;

  /**
   * Experimental feature that will try to create more meaningful names from
   * the operation path than the response object by leveraging common
   * conventions.
   *
   * For example, given the operation 'GET /users/{userId}/car', OpenAPI-to-GraphQL will
   * create a Query field 'userCar'. Note that because 'users' is followed by
   * the parameter 'userId', it insinuates that this operation will get the car
   * that belongs to a singular user. Hence, the name 'userCar' is more fitting
   * than 'usersCar' so the pluralizing 's' is dropped.
   *
   * This option will also consider irregular plural forms.
   */
  singularNames: boolean;

  // Resolver options

  /**
   * Custom headers to send with every request made by a resolve function.
   */
  headers?: Headers | RequestHeadersFunction<TSource, TContext, TArgs>;

  /**
   * Custom query parameters to send with every reqeust by a resolve function.
   */
  qs?: { [key: string]: string };

  /**
   * Allows to override or add options to the node's request object used to make
   * calls to the API backend.
   * e.g. Setup the web proxy to use.
   */
  requestOptions?: RequestOptions<TSource, TContext, TArgs>;

  /**
   * Allows to override or add options to the PubSub connect object used to make
   * publish/subscribe to the API backend.
   * e.g. Setup the web proxy to use.
   */
  connectOptions?: ConnectOptions;

  /**
   * Specifies the URL on which all paths will be based on.
   * Overrides the server object in the OAS.
   */
  baseUrl?: string;

  /**
   * Allows to define custom resolvers for fields on the Query/Mutation root
   * operation type.
   *
   * In other words, instead of resolving on an operation (REST call) defined in
   * the OAS, the field will resolve on the custom resolver. Note that this will
   * also affect the behavior of links.
   *
   * The field is identifed first by the title of the OAS, then the path of the
   * operation, and lastly the method of the operation.
   *
   * Use cases include the resolution of complex relationships between types,
   * implementing performance improvements like caching, or dealing with
   * non-standard authentication requirements.
   */
  customResolvers?: OasTitlePathMethodObject<GraphQLFieldResolver<TSource, TContext, TArgs>>;

  /**
   * Allows to define custom resolvers and subscribe functions for fields on the
   * Subscription root operation type.
   *
   * In other words, instead of resolving on an operation (REST call) defined in
   * the OAS, the field will resolve on the custom resolver. Note that this will
   * also affect the behavior of links.
   *
   * The field is identifed first by the title of the OAS, then the path of the
   * operation, and lastly the method of the operation.
   *
   * Use cases include the resolution of complex relationships between types,
   * implementing performance improvements like caching, or dealing with
   * non-standard authentication requirements.
   *
   * Note: Subscription fields will only be generated if the
   * createSubscriptionsFromCallbacks option is enabled.
   */
  customSubscriptionResolvers?: OasTitlePathMethodObject<{
    subscribe: GraphQLFieldResolver<TSource, SubscriptionContext, TArgs>;
    resolve: GraphQLFieldResolver<TSource, TContext, TArgs>;
  }>;

  // Authentication options

  /**
   * Determines whether OpenAPI-to-GraphQL should create viewers that allow users to pass
   * basic auth and API key credentials.
   */
  viewer: boolean;

  /**
   * JSON path to OAuth 2 token contained in GraphQL context. Tokens will per
   * default be sent in "Authorization" header.
   */
  tokenJSONpath?: string;

  /**
   * Determines whether to send OAuth 2 token as query parameter instead of in
   * header.
   */
  sendOAuthTokenInQuery: boolean;

  // Logging options

  /**
   * The error extensions is part of the GraphQLErrors that will be returned if
   * the query cannot be fulfilled. It provides information about the failed
   * REST call(e.g. the method, path, status code, response
   * headers, and response body). It can be useful for debugging but may
   * unintentionally leak information.
   *
   * This option prevents the extensions from being created.
   */
  provideErrorExtensions: boolean;

  /**
   * Appends a small statement to the end of field description that clarifies
   * the operation that the field will trigger.
   *
   * Will affect query and mutation fields as well as fields created from links
   *
   * In the form of: 'Equivalent to {title of OAS} {method in ALL_CAPS} {path}'
   * Will forgo the title is only one OAS is provided
   */
  equivalentToMessages: boolean;

  /**
   * Custom fetch implementation
   */
  fetch: typeof import('cross-fetch').fetch;

  /**
   * Middlewares for Resolver Factory
   */
  resolverMiddleware: ResolverMiddleware<TSource, TContext, TArgs>;

  /**
   * Includes HTTP Details to the result object
   */
  includeHttpDetails?: boolean;
  pubsub: MeshPubSub;
  logger: Logger;
};
