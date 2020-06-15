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
import { Options, InternalOptions, Report } from './types/options';
import { Oas3 } from './types/oas3';
import { Oas2 } from './types/oas2';
import { Args, Field } from './types/graphql';
import { Operation } from './types/operation';
import { PreprocessingData } from './types/preprocessing_data';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';

// Imports:
import { getGraphQLType, getArgs } from './schema_builder';
import { getResolver } from './resolver_builder';
import * as GraphQLTools from './graphql_tools';
import { preprocessOas } from './preprocessor';
import * as Oas3Tools from './oas_3_tools';
import { createAndLoadViewer } from './auth_builder';
import debug from 'debug';
import { GraphQLSchemaConfig } from 'graphql/type/schema';
import { sortObject, handleWarning } from './utils';

type Result = {
  schema: GraphQLSchema;
  report: Report;
};

const translationLog = debug('translation');

/**
 * Creates a GraphQL interface from the given OpenAPI Specification (2 or 3).
 */
export async function createGraphQLSchema(spec: Oas3 | Oas2 | (Oas3 | Oas2)[], options?: Options): Promise<Result> {
  if (typeof options === 'undefined') {
    options = {};
  }

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

  options.fetch = typeof options.fetch === 'function' ? options.fetch : await import('cross-fetch').then(m => m.fetch);

  options.resolverMiddleware =
    typeof options.resolverMiddleware === 'function'
      ? options.resolverMiddleware
      : (resolverFactoryParams, factory) => factory(resolverFactoryParams);

  options.report = {
    warnings: [],
    numOps: 0,
    numOpsQuery: 0,
    numOpsMutation: 0,
    numQueriesCreated: 0,
    numMutationsCreated: 0,
  };

  options.skipSchemaValidation =
    typeof options.skipSchemaValidation === 'boolean' ? options.skipSchemaValidation : false;

  let oass: Oas3[];

  if (Array.isArray(spec)) {
    /**
     * Convert all non-OAS 3.0.x into OAS 3.0.x
     */
    oass = await Promise.all(
      spec.map(ele => {
        return Oas3Tools.getValidOAS3(ele, options);
      })
    );
  } else {
    /**
     * Check if the spec is a valid OAS 3.0.x
     * If the spec is OAS 2.0, attempt to translate it into 3.0.x, then try to
     * translate the spec into a GraphQL schema
     */
    oass = [await Oas3Tools.getValidOAS3(spec, options)];
  }

  const { schema, report } = await translateOpenAPIToGraphQL(oass, options as InternalOptions);
  return {
    schema,
    report,
  };
}

/**
 * Creates a GraphQL interface from the given OpenAPI Specification 3.0.x
 */
async function translateOpenAPIToGraphQL(
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

    // Resolver options
    headers,
    qs,
    requestOptions,
    baseUrl,
    customResolvers,
    fetch,
    resolverMiddleware,

    // Authentication options
    viewer,
    tokenJSONpath,
    sendOAuthTokenInQuery,

    // Logging options
    provideErrorExtensions,
    equivalentToMessages,
  }: InternalOptions
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

    // Resolver options
    headers,
    qs,
    requestOptions,
    baseUrl,
    customResolvers,
    fetch,
    resolverMiddleware,

    // Authentication options
    viewer,
    tokenJSONpath,
    sendOAuthTokenInQuery,

    // Logging options
    provideErrorExtensions,
    equivalentToMessages,
  };
  translationLog(`Options: ${JSON.stringify(options)}`);

  /**
   * Extract information from the OASs and put it inside a data structure that
   * is easier for OpenAPI-to-GraphQL to use
   */
  const data: PreprocessingData = preprocessOas(oass, options);

  preliminaryChecks(options, data);

  /**
   * Create GraphQL fields for every operation and structure them based on their
   * characteristics (query vs. mutation, auth vs. non-auth).
   */
  let queryFields = {};
  let mutationFields = {};
  let authQueryFields = {};
  let authMutationFields = {};
  Object.entries(data.operations).forEach(([operationId, operation]) => {
    translationLog(`Process operation '${operation.operationString}'...`);

    const field = getFieldForOperation(operation, options.baseUrl, data, requestOptions);

    const saneOperationId = Oas3Tools.sanitize(operationId, Oas3Tools.CaseStyle.camelCase);

    // Check if the operation should be added as a Query or Mutation field
    if (!operation.isMutation) {
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
            fieldName = Oas3Tools.storeSaneName(saneOperationId, operationId, data.saneMap);
          }

          if (fieldName in authQueryFields[securityRequirement]) {
            handleWarning({
              typeKey: 'DUPLICATE_FIELD_NAME',
              message:
                `Multiple operations have the same name ` +
                `'${fieldName}' and security requirement ` +
                `'${securityRequirement}'. GraphQL field names must be ` +
                `unique so only one can be added to the authentication ` +
                `viewer. Operation '${operation.operationString}' will be ignored.`,
              data,
              log: translationLog,
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
          fieldName = Oas3Tools.storeSaneName(saneOperationId, operationId, data.saneMap);
        }

        if (fieldName in queryFields) {
          handleWarning({
            typeKey: 'DUPLICATE_FIELD_NAME',
            message:
              `Multiple operations have the same name ` +
              `'${fieldName}'. GraphQL field names must be ` +
              `unique so only one can be added to the Query object. ` +
              `Operation '${operation.operationString}' will be ignored.`,
            data,
            log: translationLog,
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

        saneFieldName = Oas3Tools.storeSaneName(saneOperationId, operationId, data.saneMap);
      } else {
        const fieldName = `${operation.method}${Oas3Tools.inferResourceNameFromPath(operation.path)}`;

        saneFieldName = Oas3Tools.storeSaneName(
          Oas3Tools.sanitize(fieldName, Oas3Tools.CaseStyle.camelCase),
          fieldName,
          data.saneMap
        );
      }

      if (operation.inViewer) {
        for (const securityRequirement of operation.securityRequirements) {
          if (typeof authMutationFields[securityRequirement] !== 'object') {
            authMutationFields[securityRequirement] = {};
          }

          if (saneFieldName in authMutationFields[securityRequirement]) {
            handleWarning({
              typeKey: 'DUPLICATE_FIELD_NAME',
              message:
                `Multiple operations have the same name ` +
                `'${saneFieldName}' and security requirement ` +
                `'${securityRequirement}'. GraphQL field names must be ` +
                `unique so only one can be added to the authentication ` +
                `viewer. Operation '${operation.operationString}' will be ignored.`,
              data,
              log: translationLog,
            });
          } else {
            authMutationFields[securityRequirement][saneFieldName] = field;
          }
        }
      } else {
        if (saneFieldName in mutationFields) {
          handleWarning({
            typeKey: 'DUPLICATE_FIELD_NAME',
            message:
              `Multiple operations have the same name ` +
              `'${saneFieldName}'. GraphQL field names must be ` +
              `unique so only one can be added to the Mutation object. ` +
              `Operation '${operation.operationString}' will be ignored.`,
            data,
            log: translationLog,
          });
        } else {
          mutationFields[saneFieldName] = field;
        }
      }
    }
  });

  // Sorting fields
  queryFields = sortObject(queryFields);
  mutationFields = sortObject(mutationFields);
  authQueryFields = sortObject(authQueryFields);
  Object.keys(authQueryFields).forEach((key: string) => {
    authQueryFields[key] = sortObject(authQueryFields[key]);
  });
  authMutationFields = sortObject(authMutationFields);
  Object.keys(authMutationFields).forEach((key: string) => {
    authMutationFields[key] = sortObject(authMutationFields[key]);
  });

  /**
   * Count created queries / mutations
   */
  options.report.numQueriesCreated =
    Object.keys(queryFields).length +
    Object.keys(authQueryFields).reduce((sum, key) => {
      return sum + Object.keys(authQueryFields[key]).length;
    }, 0);

  options.report.numMutationsCreated =
    Object.keys(mutationFields).length +
    Object.keys(authMutationFields).reduce((sum, key) => {
      return sum + Object.keys(authMutationFields[key]).length;
    }, 0);

  /**
   * Organize created queries / mutations into viewer objects.
   */
  if (Object.keys(authQueryFields).length > 0) {
    Object.assign(queryFields, createAndLoadViewer(authQueryFields, data, false));
  }

  if (Object.keys(authMutationFields).length > 0) {
    Object.assign(mutationFields, createAndLoadViewer(authMutationFields, data, true));
  }

  /**
   * Build up the schema
   */
  const schemaConfig: GraphQLSchemaConfig = {
    query:
      Object.keys(queryFields).length > 0
        ? new GraphQLObjectType({
            name: 'Query',
            description: 'The start of any query',
            fields: queryFields,
          })
        : GraphQLTools.getEmptyObjectType('Query'), // A GraphQL schema must contain a Query object type
    mutation:
      Object.keys(mutationFields).length > 0
        ? new GraphQLObjectType({
            name: 'Mutation',
            description: 'The start of any mutation',
            fields: mutationFields,
          })
        : null,
  };

  /**
   * Fill in yet undefined object types to avoid GraphQLSchema from breaking.
   *
   * The reason: once creating the schema, the 'fields' thunks will resolve and
   * if a field references an undefined object types, GraphQL will throw.
   */
  Object.entries(data.operations).forEach(([opId, operation]) => {
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
function getFieldForOperation(
  operation: Operation,
  baseUrl: string,
  data: PreprocessingData,
  requestOptions: RequestInit
): Field {
  // Create GraphQL Type for response:
  const type = getGraphQLType({
    def: operation.responseDefinition,
    data,
    operation,
  });

  // Create resolve function:
  const payloadSchemaName = operation.payloadDefinition ? operation.payloadDefinition.graphQLInputObjectTypeName : null;

  const resolve = data.options.resolverMiddleware(
    () => ({
      operation,
      payloadName: payloadSchemaName,
      data,
      baseUrl,
      requestOptions,
    }),
    getResolver
  );

  // Create args:
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
  });

  return {
    type,
    resolve,
    args,
    description: operation.description,
  };
}

/**
 * Ensures that the options are valid
 */
function preliminaryChecks(options: InternalOptions, data: PreprocessingData): void {
  // Check if OASs have unique titles
  const titles = data.oass.map(oas => {
    return oas.info.title;
  });

  // Find duplicates among titles
  new Set(
    titles.filter((title, index) => {
      return titles.indexOf(title) !== index;
    })
  ).forEach(title => {
    handleWarning({
      typeKey: 'MULTIPLE_OAS_SAME_TITLE',
      message: `Multiple OAS share the same title '${title}'`,
      data,
      log: translationLog,
    });
  });

  // Check customResolvers
  if (typeof options.customResolvers === 'object') {
    // Check that all OASs that are referenced in the customResolvers are provided
    Object.keys(options.customResolvers)
      .filter(title => {
        // If no OAS contains this title
        return !data.oass.some(oas => {
          return title === oas.info.title;
        });
      })
      .forEach(title => {
        handleWarning({
          typeKey: 'CUSTOM_RESOLVER_UNKNOWN_OAS',
          message: `Custom resolvers reference OAS '${title}' but no such ` + `OAS was provided`,
          data,
          log: translationLog,
        });
      });

    // TODO: Only run the following test on OASs that exist. See previous check.
    Object.keys(options.customResolvers).forEach(title => {
      // Get all operations from a particular OAS
      const operations = Object.values(data.operations).filter(operation => {
        return title === operation.oas.info.title;
      });

      Object.keys(options.customResolvers[title]).forEach(path => {
        Object.keys(options.customResolvers[title][path]).forEach(method => {
          if (
            !operations.some(operation => {
              return path === operation.path && method === operation.method;
            })
          ) {
            handleWarning({
              typeKey: 'CUSTOM_RESOLVER_UNKNOWN_PATH_METHOD',
              message:
                `A custom resolver references an operation with ` +
                `path '${path}' and method '${method}' but no such operation ` +
                `exists in OAS '${title}'`,
              data,
              log: translationLog,
            });
          }
        });
      });
    });
  }
}

export { sanitize, CaseStyle } from './oas_3_tools';
export { GraphQLOperationType } from './types/graphql';
