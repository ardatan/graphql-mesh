// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * Defines the functions exposed by OpenAPI-to-GraphQL.
 *
 * Some general notes:
 *
 * - GraphQL interfaces rely on sanitized strings for (input) object type names
 *   and fields. We perform sanitization only when assigning (field-) names, but
 *   keep keys in the OAS otherwise as-is, to ensure that inner-OAS references
 *   work as expected.
 *
 * - GraphQL (input) object types must have a unique name. Thus, sometimes Input
 *   object types and object types need separate names, despite them having the
 *   same structure. We thus append 'Input' to every input object type's name
 *   as a convention.
 *
 * - To pass data between resolve functions, OpenAPI-to-GraphQL uses a _openAPIToGraphQL object
 *   returned by every resolver in addition to its original data (OpenAPI-to-GraphQL does
 *   not use the context to do so, which is an anti-pattern according to
 *   https://github.com/graphql/graphql-js/issues/953).
 *
 * - OpenAPI-to-GraphQL can handle basic authentication and API key-based authentication
 *   through GraphQL. To do this, OpenAPI-to-GraphQL creates two new intermediate Object
 *   Types called QueryViewer and MutationViewer that take as input security
 *   credentials and pass them on using the _openAPIToGraphQL object to other resolve
 *   functions.
 */

// Type imports:
import { Options, InternalOptions, Report, ConnectOptions, RequestOptions } from './types/options';
import { Oas3 } from './types/oas3';
import { Args, GraphQLOperationType, SubscriptionContext } from './types/graphql';
import { Operation } from './types/operation';
import { PreprocessingData } from './types/preprocessing_data';
import { GraphQLSchema, GraphQLObjectType, GraphQLFieldConfig, GraphQLOutputType } from 'graphql';

// Imports:
import { getGraphQLType, getArgs } from './schema_builder';
import { getPublishResolver, getResolver, getSubscribe } from './resolver_builder';
import * as GraphQLTools from './graphql_tools';
import { preprocessOas } from './preprocessor';
import * as Oas3Tools from './oas_3_tools';
import { createAndLoadViewer } from './auth_builder';
import { GraphQLSchemaConfig } from 'graphql/type/schema';
import { sortObject, handleWarning, MitigationTypes } from './utils';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { asArray, DefaultLogger } from '@graphql-mesh/utils';
import { inspect } from 'util';

type Result = {
  schema: GraphQLSchema;
  report: Report;
};

/**
 * Creates a GraphQL interface from the given OpenAPI Specification (2 or 3).
 */
export async function createGraphQLSchema<TSource, TContext, TArgs>(
  oasOrOass: Oas3 | Oas3[],
  options: Options<TSource, TContext, TArgs> = {}
): Promise<Result> {
  // Setting default options
  options.strict = typeof options.strict === 'boolean' ? options.strict : false;

  // Schema options
  options.operationIdFieldNames =
    typeof options.operationIdFieldNames === 'boolean' ? options.operationIdFieldNames : false;
  options.fillEmptyResponses = typeof options.fillEmptyResponses === 'boolean' ? options.fillEmptyResponses : false;
  options.addLimitArgument = typeof options.addLimitArgument === 'boolean' ? options.addLimitArgument : false;
  options.genericPayloadArgName =
    typeof options.genericPayloadArgName === 'boolean' ? options.genericPayloadArgName : false;
  options.simpleNames = typeof options.simpleNames === 'boolean' ? options.simpleNames : false;
  options.singularNames = typeof options.singularNames === 'boolean' ? options.singularNames : false;

  // Authentication options
  options.viewer = typeof options.viewer === 'boolean' ? options.viewer : true;
  options.sendOAuthTokenInQuery =
    typeof options.sendOAuthTokenInQuery === 'boolean' ? options.sendOAuthTokenInQuery : false;

  // Logging options
  options.provideErrorExtensions =
    typeof options.provideErrorExtensions === 'boolean' ? options.provideErrorExtensions : true;
  options.equivalentToMessages =
    typeof options.equivalentToMessages === 'boolean' ? options.equivalentToMessages : true;

  options.logger = options.logger || new DefaultLogger('openapi-to-graphql');

  options.resolverMiddleware =
    typeof options.resolverMiddleware === 'function'
      ? options.resolverMiddleware
      : (resolverFactoryParams, factory) => factory(resolverFactoryParams, options.logger);

  options.report = {
    warnings: [],
    numOps: 0,
    numOpsQuery: 0,
    numOpsMutation: 0,
    numOpsSubscription: 0,
    numQueriesCreated: 0,
    numMutationsCreated: 0,
    numSubscriptionsCreated: 0,
  };

  options.includeHttpDetails = typeof options.includeHttpDetails === 'boolean' ? options.includeHttpDetails : false;

  const { schema, report } = await translateOpenAPIToGraphQL(
    asArray(oasOrOass),
    options as InternalOptions<TSource, TContext, TArgs>
  );
  return {
    schema,
    report,
  };
}

/**
 * Creates a GraphQL interface from the given OpenAPI Specification 3.0.x
 */
async function translateOpenAPIToGraphQL<TSource, TContext, TArgs>(
  oass: Oas3[],
  {
    strict,
    report,

    // Schema options
    operationIdFieldNames,
    fillEmptyResponses,
    addLimitArgument,
    idFormats,
    selectQueryOrMutationField,
    genericPayloadArgName,
    simpleNames,
    singularNames,
    includeHttpDetails,

    // Resolver options
    headers,
    qs,
    requestOptions,
    connectOptions,
    baseUrl,
    customResolvers,
    fetch,
    resolverMiddleware,
    pubsub,

    // Authentication options
    viewer,
    tokenJSONpath,
    sendOAuthTokenInQuery,

    // Logging options
    provideErrorExtensions,
    equivalentToMessages,
    logger,
  }: InternalOptions<TSource, TContext, TArgs>
): Promise<{ schema: GraphQLSchema; report: Report }> {
  const options = {
    strict,
    report,

    // Schema options
    operationIdFieldNames,
    fillEmptyResponses,
    addLimitArgument,
    idFormats,
    selectQueryOrMutationField,
    genericPayloadArgName,
    simpleNames,
    singularNames,
    includeHttpDetails,

    // Resolver options
    headers,
    qs,
    requestOptions,
    connectOptions,
    baseUrl,
    customResolvers,
    fetch,
    resolverMiddleware,
    pubsub,

    // Authentication options
    viewer,
    tokenJSONpath,
    sendOAuthTokenInQuery,

    // Logging options
    provideErrorExtensions,
    equivalentToMessages,

    logger,
  };

  const translationLogger = options.logger.child('translation');
  translationLogger.debug(`Options: ${inspect(options)}`);

  /**
   * Extract information from the OASs and put it inside a data structure that
   * is easier for OpenAPI-to-GraphQL to use
   */
  const data: PreprocessingData<TSource, TContext, TArgs> = preprocessOas(oass, options);

  preliminaryChecks(options, data, translationLogger);

  // Query, Mutation, and Subscription fields
  let queryFields: { [fieldName: string]: GraphQLFieldConfig<any, any> } = {};
  let mutationFields: { [fieldName: string]: GraphQLFieldConfig<any, any> } = {};
  let subscriptionFields: {
    [fieldName: string]: GraphQLFieldConfig<any, any>;
  } = {};

  // Authenticated Query, Mutation, and Subscription fields
  let authQueryFields: {
    [fieldName: string]: {
      [securityRequirement: string]: GraphQLFieldConfig<any, any>;
    };
  } = {};
  let authMutationFields: {
    [fieldName: string]: {
      [securityRequirement: string]: GraphQLFieldConfig<any, any>;
    };
  } = {};
  let authSubscriptionFields: {
    [fieldName: string]: {
      [securityRequirement: string]: GraphQLFieldConfig<any, any>;
    };
  } = {};

  // Add Query and Mutation fields
  Object.entries(data.operations).forEach(([operationId, operation]) => {
    translationLogger.debug(`Process operation '${operation.operationString}'...`);

    const field = getFieldForOperation(
      operation,
      options.baseUrl,
      data,
      requestOptions,
      connectOptions,
      includeHttpDetails,
      pubsub,
      logger
    );

    const saneOperationId = Oas3Tools.sanitize(operationId, Oas3Tools.CaseStyle.camelCase);

    // Check if the operation should be added as a Query or Mutation
    if (operation.operationType === GraphQLOperationType.Query) {
      let fieldName = !singularNames
        ? Oas3Tools.uncapitalize(operation.responseDefinition.graphQLTypeName)
        : Oas3Tools.sanitize(Oas3Tools.inferResourceNameFromPath(operation.path), Oas3Tools.CaseStyle.camelCase);

      if (operation.inViewer) {
        for (const securityRequirement of operation.securityRequirements) {
          if (typeof authQueryFields[securityRequirement] !== 'object') {
            authQueryFields[securityRequirement] = {};
          }
          // Avoid overwriting fields that return the same data:
          if (
            fieldName in authQueryFields[securityRequirement] ||
            /**
             * If the option is set operationIdFieldNames, the fieldName is
             * forced to be the operationId
             */
            operationIdFieldNames
          ) {
            fieldName = Oas3Tools.storeSaneName(saneOperationId, operationId, data.saneMap, options.logger);
          }

          if (fieldName in authQueryFields[securityRequirement]) {
            handleWarning({
              mitigationType: MitigationTypes.DUPLICATE_FIELD_NAME,
              message:
                `Multiple operations have the same name ` +
                `'${fieldName}' and security requirement ` +
                `'${securityRequirement}'. GraphQL field names must be ` +
                `unique so only one can be added to the authentication ` +
                `viewer. Operation '${operation.operationString}' will be ignored.`,
              data,
              logger: translationLogger,
            });
          } else {
            authQueryFields[securityRequirement][fieldName] = field;
          }
        }
      } else {
        // Avoid overwriting fields that return the same data:
        if (
          fieldName in queryFields ||
          /**
           * If the option is set operationIdFieldNames, the fieldName is
           * forced to be the operationId
           */
          operationIdFieldNames
        ) {
          fieldName = Oas3Tools.storeSaneName(saneOperationId, operationId, data.saneMap, options.logger);
        }

        if (fieldName in queryFields) {
          handleWarning({
            mitigationType: MitigationTypes.DUPLICATE_FIELD_NAME,
            message:
              `Multiple operations have the same name ` +
              `'${fieldName}'. GraphQL field names must be ` +
              `unique so only one can be added to the Query object. ` +
              `Operation '${operation.operationString}' will be ignored.`,
            data,
            logger: translationLogger,
          });
        } else {
          queryFields[fieldName] = field;
        }
      }
    } else {
      let saneFieldName;

      if (!singularNames) {
        /**
         * Use operationId to avoid problems differentiating operations with the
         * same path but differnet methods
         */
        saneFieldName = Oas3Tools.storeSaneName(saneOperationId, operationId, data.saneMap, options.logger);
      } else {
        const fieldName = `${operation.method}${Oas3Tools.inferResourceNameFromPath(operation.path)}`;

        saneFieldName = Oas3Tools.storeSaneName(
          Oas3Tools.sanitize(fieldName, Oas3Tools.CaseStyle.camelCase),
          fieldName,
          data.saneMap,
          options.logger
        );
      }

      if (operation.inViewer) {
        for (const securityRequirement of operation.securityRequirements) {
          if (typeof authMutationFields[securityRequirement] !== 'object') {
            authMutationFields[securityRequirement] = {};
          }

          if (saneFieldName in authMutationFields[securityRequirement]) {
            handleWarning({
              mitigationType: MitigationTypes.DUPLICATE_FIELD_NAME,
              message:
                `Multiple operations have the same name ` +
                `'${saneFieldName}' and security requirement ` +
                `'${securityRequirement}'. GraphQL field names must be ` +
                `unique so only one can be added to the authentication ` +
                `viewer. Operation '${operation.operationString}' will be ignored.`,
              data,
              logger: translationLogger,
            });
          } else {
            authMutationFields[securityRequirement][saneFieldName] = field;
          }
        }
      } else {
        if (saneFieldName in mutationFields) {
          handleWarning({
            mitigationType: MitigationTypes.DUPLICATE_FIELD_NAME,
            message:
              `Multiple operations have the same name ` +
              `'${saneFieldName}'. GraphQL field names must be ` +
              `unique so only one can be added to the Mutation object. ` +
              `Operation '${operation.operationString}' will be ignored.`,
            data,
            logger: translationLogger,
          });
        } else {
          mutationFields[saneFieldName] = field;
        }
      }
    }
  });

  // Add Subscription fields
  Object.entries(data.callbackOperations).forEach(([operationId, operation]) => {
    translationLogger.debug(`Process operation '${operationId}'...`);

    const field = getFieldForOperation(
      operation,
      options.baseUrl,
      data,
      requestOptions,
      connectOptions,
      includeHttpDetails,
      pubsub,
      logger
    );

    const saneOperationId = Oas3Tools.sanitize(operationId, Oas3Tools.CaseStyle.camelCase);

    const saneFieldName = Oas3Tools.storeSaneName(saneOperationId, operationId, data.saneMap, options.logger);
    if (operation.inViewer) {
      for (const securityRequirement of operation.securityRequirements) {
        if (typeof authSubscriptionFields[securityRequirement] !== 'object') {
          authSubscriptionFields[securityRequirement] = {};
        }

        if (saneFieldName in authSubscriptionFields[securityRequirement]) {
          handleWarning({
            mitigationType: MitigationTypes.DUPLICATE_FIELD_NAME,
            message:
              `Multiple operations have the same name ` +
              `'${saneFieldName}' and security requirement ` +
              `'${securityRequirement}'. GraphQL field names must be ` +
              `unique so only one can be added to the authentication ` +
              `viewer. Operation '${operation.operationString}' will be ignored.`,
            data,
            logger: translationLogger,
          });
        } else {
          authSubscriptionFields[securityRequirement][saneFieldName] = field;
        }
      }
    } else {
      if (saneFieldName in subscriptionFields) {
        handleWarning({
          mitigationType: MitigationTypes.DUPLICATE_FIELD_NAME,
          message:
            `Multiple operations have the same name ` +
            `'${saneFieldName}'. GraphQL field names must be ` +
            `unique so only one can be added to the Mutation object. ` +
            `Operation '${operation.operationString}' will be ignored.`,
          data,
          logger: translationLogger,
        });
      } else {
        subscriptionFields[saneFieldName] = field;
      }
    }
  });

  // Sorting fields
  queryFields = sortObject(queryFields);
  mutationFields = sortObject(mutationFields);
  subscriptionFields = sortObject(subscriptionFields);
  authQueryFields = sortObject(authQueryFields);
  Object.keys(authQueryFields).forEach(key => {
    authQueryFields[key] = sortObject(authQueryFields[key]);
  });
  authMutationFields = sortObject(authMutationFields);
  Object.keys(authMutationFields).forEach(key => {
    authMutationFields[key] = sortObject(authMutationFields[key]);
  });
  authSubscriptionFields = sortObject(authSubscriptionFields);
  Object.keys(authSubscriptionFields).forEach(key => {
    authSubscriptionFields[key] = sortObject(authSubscriptionFields[key]);
  });

  // Count created Query, Mutation, and Subscription fields
  options.report.numQueriesCreated =
    Object.keys(queryFields).length +
    Object.keys(authQueryFields).reduce((sum, key) => {
      return (sum as any) + Object.keys(authQueryFields[key]).length;
    }, 0);

  options.report.numMutationsCreated =
    Object.keys(mutationFields).length +
    Object.keys(authMutationFields).reduce((sum, key) => {
      return (sum as any) + Object.keys(authMutationFields[key]).length;
    }, 0);

  options.report.numSubscriptionsCreated =
    Object.keys(subscriptionFields).length +
    Object.keys(authSubscriptionFields).reduce((sum, key) => {
      return (sum as any) + Object.keys(authSubscriptionFields[key]).length;
    }, 0);

  /**
   * Organize authenticated Query, Mutation, and Subscriptions fields into
   * viewer objects.
   */
  if (Object.keys(authQueryFields).length > 0) {
    Object.assign(
      queryFields,
      createAndLoadViewer(authQueryFields, GraphQLOperationType.Query, data, includeHttpDetails, options.logger)
    );
  }

  if (Object.keys(authMutationFields).length > 0) {
    Object.assign(
      mutationFields,
      createAndLoadViewer(authMutationFields, GraphQLOperationType.Mutation, data, includeHttpDetails, options.logger)
    );
  }

  if (Object.keys(authSubscriptionFields).length > 0) {
    Object.assign(
      subscriptionFields,
      createAndLoadViewer(
        authSubscriptionFields,
        GraphQLOperationType.Subscription,
        data,
        includeHttpDetails,
        options.logger
      )
    );
  }

  // Build up the schema
  const schemaConfig: GraphQLSchemaConfig = {
    query:
      Object.keys(queryFields).length > 0
        ? new GraphQLObjectType({
            name: 'Query',
            fields: queryFields,
          })
        : GraphQLTools.getEmptyObjectType('Query'), // A GraphQL schema must contain a Query object type
    mutation:
      Object.keys(mutationFields).length > 0
        ? new GraphQLObjectType({
            name: 'Mutation',
            fields: mutationFields,
          })
        : null,
    subscription:
      Object.keys(subscriptionFields).length > 0
        ? new GraphQLObjectType({
            name: 'Subscription',
            fields: subscriptionFields,
          })
        : null,
  };

  /**
   * Fill in yet undefined object types to avoid GraphQLSchema from breaking.
   *
   * The reason: once creating the schema, the 'fields' thunks will resolve and
   * if a field references an undefined object type, GraphQL will throw.
   */
  Object.entries(data.operations).forEach(([, operation]) => {
    if (typeof operation.responseDefinition.graphQLType === 'undefined') {
      operation.responseDefinition.graphQLType = GraphQLTools.getEmptyObjectType(
        operation.responseDefinition.graphQLTypeName
      );
    }
  });

  const schema = new GraphQLSchema(schemaConfig);

  return { schema, report: options.report };
}

/**
 * Creates the field object for the given operation.
 */
function getFieldForOperation<TSource, TContext, TArgs>(
  operation: Operation,
  baseUrl: string,
  data: PreprocessingData<TSource, TContext, TArgs>,
  requestOptions: RequestOptions<TSource, TContext, TArgs>,
  connectOptions: ConnectOptions,
  includeHttpDetails: boolean,
  pubsub: MeshPubSub,
  logger: Logger
): GraphQLFieldConfig<TSource, TContext | SubscriptionContext, TArgs> {
  // Create GraphQL Type for response:
  const type = getGraphQLType({
    def: operation.responseDefinition,
    data,
    operation,
    includeHttpDetails,
    logger,
  }) as GraphQLOutputType;

  const payloadSchemaName = operation.payloadDefinition ? operation.payloadDefinition.graphQLInputObjectTypeName : null;

  const args: Args = getArgs({
    /**
     * Even though these arguments seems redundent because of the operation
     * argument, the function cannot be refactored because it is also used to
     * create arguments for links. The operation argument is really used to pass
     * data to other functions.
     */
    requestPayloadDef: operation.payloadDefinition,
    parameters: operation.parameters,
    operation,
    data,
    includeHttpDetails,
    logger,
  });

  // Get resolver and subscribe function for Subscription fields
  if (operation.operationType === GraphQLOperationType.Subscription) {
    const responseSchemaName = operation.responseDefinition ? operation.responseDefinition.graphQLTypeName : null;

    const resolve = getPublishResolver({
      operation,
      responseName: responseSchemaName,
      data,
      logger,
    });

    const subscribe = getSubscribe({
      operation,
      payloadName: payloadSchemaName,
      data,
      baseUrl,
      connectOptions,
      pubsub,
      logger,
    });

    return {
      type,
      resolve,
      subscribe,
      args,
      description: operation.description,
    };

    // Get resolver for Query and Mutation fields
  } else {
    const resolve = data.options.resolverMiddleware(
      () => ({
        operation,
        payloadName: payloadSchemaName,
        data,
        baseUrl,
        requestOptions,
        logger,
      }),
      getResolver
    );

    return {
      type,
      resolve,
      args,
      description: operation.description,
    };
  }
}

/**
 * Ensure that the customResolvers/customSubscriptionResolvers object is a
 * triply nested object using the name of the OAS, the path, and the method
 * as keys.
 */
function checkCustomResolversStructure<TSource, TContext, TArgs>(
  customResolvers: any,
  data: PreprocessingData<TSource, TContext, TArgs>,
  translationLogger: Logger
) {
  if (typeof customResolvers === 'object') {
    // Check that all OASs that are referenced in the customResolvers are provided
    Object.keys(customResolvers)
      .filter(title => {
        // If no OAS contains this title
        return !data.oass.some(oas => {
          return title === oas.info?.title;
        });
      })
      .forEach(title => {
        handleWarning({
          mitigationType: MitigationTypes.CUSTOM_RESOLVER_UNKNOWN_OAS,
          message: `Custom resolvers reference OAS '${title.toString()}' but no such ` + `OAS was provided`,
          data,
          logger: translationLogger,
        });
      });

    // TODO: Only run the following test on OASs that exist. See previous check.
    Object.keys(customResolvers).forEach(title => {
      // Get all operations from a particular OAS
      const operations = Object.values(data.operations).filter(operation => {
        return title === operation.oas.info?.title;
      });

      Object.keys(customResolvers[title]).forEach(path => {
        Object.keys(customResolvers[title][path]).forEach(method => {
          if (
            !operations.some(operation => {
              return path === operation.path && method === operation.method;
            })
          ) {
            handleWarning({
              mitigationType: MitigationTypes.CUSTOM_RESOLVER_UNKNOWN_PATH_METHOD,
              message:
                `A custom resolver references an operation with ` +
                `path '${path.toString()}' and method '${method.toString()}' but no such operation ` +
                `exists in OAS '${title.toString()}'`,
              data,
              logger: translationLogger,
            });
          }
        });
      });
    });
  }
}

/**
 * Ensures that the options are valid
 */
function preliminaryChecks<TSource, TContext, TArgs>(
  options: InternalOptions<TSource, TContext, TArgs>,
  data: PreprocessingData<TSource, TContext, TArgs>,
  translationLogger: Logger
): void {
  // Check if OASs have unique titles
  const titles = data.oass.map(oas => {
    return oas.info?.title;
  });

  // Find duplicates among titles
  new Set(
    titles.filter((title, index) => {
      return titles.indexOf(title) !== index;
    })
  ).forEach(title => {
    handleWarning({
      mitigationType: MitigationTypes.MULTIPLE_OAS_SAME_TITLE,
      message: `Multiple OAS share the same title '${title}'`,
      data,
      logger: translationLogger,
    });
  });

  // Check customResolvers
  checkCustomResolversStructure(options.customResolvers, data, translationLogger);

  // Check customSubscriptionResolvers
  checkCustomResolversStructure(options.customSubscriptionResolvers, data, translationLogger);
}

export { sanitize, CaseStyle } from './oas_3_tools';
export { GraphQLOperationType } from './types/graphql';
