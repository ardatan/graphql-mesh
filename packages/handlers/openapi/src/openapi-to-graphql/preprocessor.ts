// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

// Type imports:
import {
  Oas3,
  CallbackObject,
  LinkObject,
  OperationObject,
  ReferenceObject,
  SchemaObject,
  PathItemObject,
} from './types/oas3';
import { InternalOptions } from './types/options';
import { Operation, DataDefinition } from './types/operation';
import { PreprocessingData, ProcessedSecurityScheme } from './types/preprocessing_data';

// Imports:
import * as Oas3Tools from './oas_3_tools';
import deepEqual from 'deep-equal';
import { handleWarning, getCommonPropertyNames, MitigationTypes } from './utils';
import { GraphQLOperationType } from './types/graphql';
import { methodToHttpMethod } from './oas_3_tools';
import { Logger } from '@graphql-mesh/types';
import { inspect } from 'util';

/**
 * Given an operation object from the OAS, create an Operation, which contains
 * the necessary data to create a GraphQL wrapper for said operation object.
 *
 * @param path The path of the operation object
 * @param method The method of the operation object
 * @param operationString A string representation of the path and the method (and the OAS title if applicable)
 * @param operationType Whether the operation should be turned into a Query/Mutation/Subscription operation
 * @param operation The operation object from the OAS
 * @param pathItem The path item object from the OAS from which the operation object is derived from
 * @param oas The OAS from which the path item and operation object are derived from
 * @param data An assortment of data which at this point is mainly used enable logging
 * @param options The options passed by the user
 */
function processOperation<TSource, TContext, TArgs>(
  path: string,
  method: Oas3Tools.HTTP_METHODS,
  operationString: string,
  operationType: GraphQLOperationType,
  operation: OperationObject,
  pathItem: PathItemObject,
  oas: Oas3,
  data: PreprocessingData<TSource, TContext, TArgs>,
  options: InternalOptions<TSource, TContext, TArgs>
): Operation {
  const preprocessingLogger = options.logger.child('preprocessing');
  // Determine description
  let description = operation.description;
  if ((typeof description !== 'string' || description === '') && typeof operation.summary === 'string') {
    description = operation.summary;
  }

  if (data.options.equivalentToMessages) {
    // Description may not exist
    if (typeof description !== 'string') {
      description = '';
    }

    description += `\n\nEquivalent to ${operationString}`;
  }

  // Hold on to the operationId
  const operationId =
    typeof operation.operationId !== 'undefined' ? operation.operationId : Oas3Tools.generateOperationId(method, path);

  // Request schema
  const { payloadContentType, payloadSchema, payloadSchemaNames, payloadRequired } = Oas3Tools.getRequestSchemaAndNames(
    path,
    operation,
    oas
  );

  const payloadDefinition =
    payloadSchema && typeof payloadSchema !== 'undefined'
      ? createDataDef(payloadSchemaNames, payloadSchema as SchemaObject, true, data, oas, options.logger)
      : undefined;

  // Response schema
  const { responseContentType, responseSchema, responseSchemaNames, statusCode } = Oas3Tools.getResponseSchemaAndNames(
    path,
    method,
    operation,
    oas,
    data,
    options
  );

  if (!responseSchema || typeof responseSchema !== 'object') {
    handleWarning({
      mitigationType: MitigationTypes.MISSING_RESPONSE_SCHEMA,
      message:
        `Operation ${operationString} has no (valid) response schema. ` +
        `You can use the fillEmptyResponses option to create a ` +
        `placeholder schema`,
      data,
      logger: preprocessingLogger,
    });

    return undefined;
  }

  // Links
  const links = Oas3Tools.getLinks(path, method, operation, oas, data, options.logger);

  const responseDefinition = createDataDef(
    responseSchemaNames,
    responseSchema as SchemaObject,
    false,
    data,
    oas,
    options.logger,
    links
  );

  // Parameters
  const parameters = Oas3Tools.getParameters(path, method, operation, pathItem, oas, options.logger);

  // Security protocols
  const securityRequirements = options.viewer ? Oas3Tools.getSecurityRequirements(operation, data.security, oas) : [];

  // Servers
  const servers = Oas3Tools.getServers(operation, pathItem, oas);

  // Whether to place this operation into an authentication viewer
  const inViewer = securityRequirements.length > 0 && data.options.viewer !== false;

  return {
    operationId,
    operationString,
    operationType,
    description,
    path,
    method,
    payloadContentType,
    payloadDefinition,
    payloadRequired,
    responseContentType,
    responseDefinition,
    parameters,
    securityRequirements,
    servers,
    inViewer,
    statusCode,
    oas,
  };
}

/**
 * Extract information from the OAS and put it inside a data structure that
 * is easier for OpenAPI-to-GraphQL to use
 */
export function preprocessOas<TSource, TContext, TArgs>(
  oass: Oas3[],
  options: InternalOptions<TSource, TContext, TArgs>
): PreprocessingData<TSource, TContext, TArgs> {
  const preprocessingLogger = options.logger.child('preprocessing');

  const data: PreprocessingData<TSource, TContext, TArgs> = {
    operations: {},
    callbackOperations: {},
    usedTypeNames: [
      'Query', // Used by OpenAPI-to-GraphQL for root-level element
      'Mutation', // Used by OpenAPI-to-GraphQL for root-level element
      'Subscription', // Used by OpenAPI-to-GraphQL for root-level element
    ],
    defs: [],
    security: {},
    saneMap: {},
    options,
    oass,
  };

  oass.forEach(oas => {
    // Store stats on OAS:
    data.options.report.numOps += Oas3Tools.countOperations(oas);
    data.options.report.numOpsMutation += Oas3Tools.countOperationsMutation(oas);
    data.options.report.numOpsQuery += Oas3Tools.countOperationsQuery(oas);
    data.options.report.numOpsSubscription += Oas3Tools.countOperationsSubscription(oas);

    // Get security schemes
    const currentSecurity = getProcessedSecuritySchemes(oas, data, options.logger);
    const commonSecurityPropertyName = getCommonPropertyNames(data.security, currentSecurity);
    commonSecurityPropertyName.forEach(propertyName => {
      handleWarning({
        mitigationType: MitigationTypes.DUPLICATE_SECURITY_SCHEME,
        message: `Multiple OASs share security schemes with the same name '${propertyName}'`,
        mitigationAddendum:
          `The security scheme from OAS ` + `'${currentSecurity[propertyName].oas.info?.title}' will be ignored`,
        data,
        logger: preprocessingLogger,
      });
    });

    // Do not overwrite preexisting security schemes
    data.security = { ...currentSecurity, ...data.security };

    // Process all operations
    for (const path in oas.paths) {
      const pathItem = !('$ref' in oas.paths[path])
        ? oas.paths[path]
        : (Oas3Tools.resolveRef(oas.paths[path].$ref, oas) as PathItemObject);

      Object.keys(pathItem)
        .filter(objectKey => {
          /**
           * Get only fields that contain operation objects
           *
           * Can also contain other fields such as summary or description
           */
          return Oas3Tools.isHttpMethod(objectKey);
        })
        .forEach(rawMethod => {
          const operationString =
            oass.length === 1
              ? Oas3Tools.formatOperationString(rawMethod, path)
              : Oas3Tools.formatOperationString(rawMethod, path, oas.info?.title);

          let httpMethod: Oas3Tools.HTTP_METHODS;
          try {
            httpMethod = methodToHttpMethod(rawMethod);
          } catch (e) {
            handleWarning({
              mitigationType: MitigationTypes.INVALID_HTTP_METHOD,
              message: `Invalid HTTP method '${rawMethod}' in operation '${operationString}'`,
              data,
              logger: preprocessingLogger,
            });

            return;
          }

          const operation = pathItem[httpMethod] as OperationObject;

          let operationType =
            httpMethod === Oas3Tools.HTTP_METHODS.get ? GraphQLOperationType.Query : GraphQLOperationType.Mutation;

          // Option selectQueryOrMutationField can override operation type
          if (
            typeof options.selectQueryOrMutationField === 'object' &&
            typeof options.selectQueryOrMutationField[oas.info?.title] === 'object' &&
            typeof options.selectQueryOrMutationField[oas.info?.title][path] === 'object' &&
            typeof options.selectQueryOrMutationField[oas.info?.title][path][httpMethod] === 'number' // This is an TS enum, which is translated to have a integer value
          ) {
            operationType =
              options.selectQueryOrMutationField[oas.info?.title][path][httpMethod] === GraphQLOperationType.Mutation
                ? GraphQLOperationType.Mutation
                : GraphQLOperationType.Query;
          }

          const operationData = processOperation(
            path,
            httpMethod,
            operationString,
            operationType,
            operation,
            pathItem,
            oas,
            data,
            options
          );

          if (operationData) {
            /**
             * Handle operationId property name collision
             * May occur if multiple OAS are provided
             */
            if (operationData && !(operationData.operationId in data.operations)) {
              data.operations[operationData.operationId] = operationData;
            } else {
              handleWarning({
                mitigationType: MitigationTypes.DUPLICATE_OPERATIONID,
                message: `Multiple OASs share operations with the same operationId '${operationData.operationId}'`,
                mitigationAddendum: `The operation from the OAS '${operationData.oas.info?.title}' will be ignored`,
                data,
                logger: preprocessingLogger,
              });
            }
          }

          // Process all callbacks
          if (operation.callbacks) {
            Object.entries(operation.callbacks).forEach(([callbackName, callback]) => {
              const resolvedCallback = !('$ref' in callback)
                ? callback
                : (Oas3Tools.resolveRef((callback as ReferenceObject).$ref, oas) as CallbackObject);

              Object.entries(resolvedCallback).forEach(([callbackExpression, callbackPathItem]) => {
                const resolvedCallbackPathItem = !('$ref' in callbackPathItem)
                  ? callbackPathItem
                  : Oas3Tools.resolveRef(callbackPathItem.$ref, oas);

                const callbackOperationObjectMethods = Object.keys(resolvedCallbackPathItem).filter(objectKey => {
                  /**
                   * Get only fields that contain operation objects
                   *
                   * Can also contain other fields such as summary or description
                   */
                  return Oas3Tools.isHttpMethod(objectKey.toString());
                });

                if (callbackOperationObjectMethods.length > 0) {
                  if (callbackOperationObjectMethods.length > 1) {
                    handleWarning({
                      mitigationType: MitigationTypes.CALLBACKS_MULTIPLE_OPERATION_OBJECTS,
                      message: `Callback '${callbackExpression}' on operation '${operationString}' has multiple operation objects with the methods '${callbackOperationObjectMethods}'. OpenAPI-to-GraphQL can only utilize one of these operation objects.`,
                      mitigationAddendum: `The operation with the method '${callbackOperationObjectMethods[0].toString()}' will be selected and all others will be ignored.`,
                      data,
                      logger: preprocessingLogger,
                    });
                  }

                  // Select only one of the operation object methods
                  const callbackRawMethod = callbackOperationObjectMethods[0];

                  const callbackOperationString =
                    oass.length === 1
                      ? Oas3Tools.formatOperationString(httpMethod, callbackName)
                      : Oas3Tools.formatOperationString(httpMethod, callbackName, oas.info?.title);

                  let callbackHttpMethod: Oas3Tools.HTTP_METHODS;

                  try {
                    callbackHttpMethod = methodToHttpMethod(callbackRawMethod.toString());
                  } catch (e) {
                    handleWarning({
                      mitigationType: MitigationTypes.INVALID_HTTP_METHOD,
                      message: `Invalid HTTP method '${rawMethod}' in callback '${callbackOperationString}' in operation '${operationString}'`,
                      data,
                      logger: preprocessingLogger,
                    });

                    return;
                  }

                  const callbackOperation = processOperation(
                    callbackExpression,
                    callbackHttpMethod,
                    callbackOperationString,
                    GraphQLOperationType.Subscription,
                    resolvedCallbackPathItem[callbackHttpMethod],
                    callbackPathItem,
                    oas,
                    data,
                    options
                  );

                  callbackOperation.responseContentType = callbackOperation.payloadContentType;
                  callbackOperation.responseDefinition = callbackOperation.payloadDefinition;

                  callbackOperation.parameters = operationData.parameters;
                  callbackOperation.payloadContentType = operationData.payloadContentType;
                  callbackOperation.payloadDefinition = operationData.payloadDefinition;
                  callbackOperation.payloadRequired = operationData.payloadRequired;

                  if (callbackOperation) {
                    /**
                     * Handle operationId property name collision
                     * May occur if multiple OAS are provided
                     */
                    if (callbackOperation && !(callbackOperation.operationId in data.callbackOperations)) {
                      data.callbackOperations[callbackOperation.operationId] = callbackOperation;
                    } else {
                      handleWarning({
                        mitigationType: MitigationTypes.DUPLICATE_OPERATIONID,
                        message: `Multiple OASs share callback operations with the same operationId '${callbackOperation.operationId}'`,
                        mitigationAddendum: `The callback operation from the OAS '${operationData.oas.info?.title}' will be ignored`,
                        data,
                        logger: preprocessingLogger,
                      });
                    }
                  }
                }
              });
            });
          }
        });
    }
  });

  return data;
}

/**
 * Extracts the security schemes from given OAS and organizes the information in
 * a data structure that is easier for OpenAPI-to-GraphQL to use
 *
 * Here is the structure of the data:
 * {
 *   {string} [sanitized name] { Contains information about the security protocol
 *     {string} rawName           Stores the raw security protocol name
 *     {object} def               Definition provided by OAS
 *     {object} parameters        Stores the names of the authentication credentials
 *                                  NOTE: Structure will depend on the type of the protocol
 *                                    (e.g. basic authentication, API key, etc.)
 *                                  NOTE: Mainly used for the AnyAuth viewers
 *     {object} schema            Stores the GraphQL schema to create the viewers
 *   }
 * }
 *
 * Here is an example:
 * {
 *   MyApiKey: {
 *     rawName: "My_api_key",
 *     def: { ... },
 *     parameters: {
 *       apiKey: MyKeyApiKey
 *     },
 *     schema: { ... }
 *   }
 *   MyBasicAuth: {
 *     rawName: "My_basic_auth",
 *     def: { ... },
 *     parameters: {
 *       username: MyBasicAuthUsername,
 *       password: MyBasicAuthPassword,
 *     },
 *     schema: { ... }
 *   }
 * }
 */
function getProcessedSecuritySchemes<TSource, TContext, TArgs>(
  oas: Oas3,
  data: PreprocessingData<TSource, TContext, TArgs>,
  logger: Logger
): { [key: string]: ProcessedSecurityScheme } {
  const preprocessingLogger = logger.child('preprocessing');
  const result = {};
  const security = Oas3Tools.getSecuritySchemes(oas);

  // Loop through all the security protocols
  for (const key in security) {
    const protocol = security[key];

    // Determine the schema and the parameters for the security protocol
    let schema;
    let parameters = {};
    let description;
    switch (protocol.type) {
      case 'apiKey':
        description = `API key credentials for the security protocol '${key}'`;
        if (data.oass.length > 1) {
          description += ` in ${oas.info?.title}`;
        }

        parameters = {
          apiKey: Oas3Tools.sanitize(`${key}_apiKey`, Oas3Tools.CaseStyle.camelCase),
        };

        schema = {
          type: 'object',
          description,
          properties: {
            apiKey: {
              type: 'string',
            },
          },
        };
        break;

      case 'http':
        switch (protocol.scheme) {
          /**
           * TODO: HTTP has a number of authentication types
           *
           * See http://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml
           */
          case 'basic':
            description = `Basic auth credentials for security protocol '${key}'`;

            parameters = {
              username: Oas3Tools.sanitize(`${key}_username`, Oas3Tools.CaseStyle.camelCase),
              password: Oas3Tools.sanitize(`${key}_password`, Oas3Tools.CaseStyle.camelCase),
            };

            schema = {
              type: 'object',
              description,
              properties: {
                username: {
                  type: 'string',
                },
                password: {
                  type: 'string',
                },
              },
            };
            break;

          default:
            handleWarning({
              mitigationType: MitigationTypes.UNSUPPORTED_HTTP_SECURITY_SCHEME,
              message:
                `Currently unsupported HTTP authentication protocol ` +
                `type 'http' and scheme '${protocol.scheme}' in OAS ` +
                `'${oas.info?.title}'`,
              data,
              logger: preprocessingLogger,
            });
        }
        break;

      // TODO: Implement
      case 'openIdConnect':
        handleWarning({
          mitigationType: MitigationTypes.UNSUPPORTED_HTTP_SECURITY_SCHEME,
          message:
            `Currently unsupported HTTP authentication protocol ` + `type 'openIdConnect' in OAS '${oas.info?.title}'`,
          data,
          logger: preprocessingLogger,
        });

        break;

      case 'oauth2':
        handleWarning({
          mitigationType: MitigationTypes.OAUTH_SECURITY_SCHEME,
          message:
            `OAuth security scheme found in OAS '${oas.info?.title}'. ` +
            `OAuth support is provided using the 'tokenJSONpath' option`,
          data,
          logger: preprocessingLogger,
        });

        // Continue because we do not want to create an OAuth viewer
        continue;

      default:
        handleWarning({
          mitigationType: MitigationTypes.UNSUPPORTED_HTTP_SECURITY_SCHEME,
          message: `Unsupported HTTP authentication protocol` + `type '${protocol.type}' in OAS '${oas.info?.title}'`,
          data,
          logger: preprocessingLogger,
        });
    }

    // Add protocol data to the output
    result[key] = {
      rawName: key,
      def: protocol,
      parameters,
      schema,
      oas,
    };
  }
  return result;
}

/**
 * Method to either create a new or reuse an existing, centrally stored data
 * definition.
 */
export function createDataDef<TSource, TContext, TArgs>(
  names: Oas3Tools.SchemaNames,
  schema: SchemaObject,
  isInputObjectType: boolean,
  data: PreprocessingData<TSource, TContext, TArgs>,
  oas: Oas3,
  logger: Logger,
  links?: { [key: string]: LinkObject }
): DataDefinition {
  const preprocessingLogger = logger.child('preprocessing');
  const preferredName = getPreferredName(names);

  // Basic validation test
  if (typeof schema !== 'object') {
    handleWarning({
      mitigationType: MitigationTypes.MISSING_SCHEMA,
      message:
        `Could not create data definition for schema with ` +
        `preferred name '${preferredName}' and schema '${JSON.stringify(schema)}'`,
      data,
      logger: preprocessingLogger,
    });

    // TODO: Does this change make the option fillEmptyResponses obsolete?
    return {
      preferredName,
      schema: null,
      required: [],
      links: null,
      subDefinitions: null,
      graphQLTypeName: null,
      graphQLInputObjectTypeName: null,
      targetGraphQLType: 'json',
    };
  } else {
    if ('$ref' in schema) {
      schema = Oas3Tools.resolveRef(schema.$ref, oas);
    }

    const saneLinks = {};
    if (typeof links === 'object') {
      Object.keys(links).forEach(linkKey => {
        saneLinks[
          Oas3Tools.sanitize(
            linkKey.toString(),
            !data.options.simpleNames ? Oas3Tools.CaseStyle.camelCase : Oas3Tools.CaseStyle.simple
          )
        ] = links[linkKey];
      });
    }

    // Determine the index of possible existing data definition
    const index = getSchemaIndex(preferredName, schema, data.defs);

    if (index !== -1) {
      // Found existing data definition and fetch it
      const existingDataDef = data.defs[index];

      /**
       * Collapse links if possible, i.e. if the current operation has links,
       * combine them with the prexisting ones
       */
      if (typeof saneLinks !== 'undefined') {
        if (typeof existingDataDef.links !== 'undefined') {
          // Check if there are any overlapping links
          Object.keys(existingDataDef.links).forEach(saneLinkKey => {
            if (
              typeof saneLinks[saneLinkKey] !== 'undefined' &&
              !deepEqual(existingDataDef.links[saneLinkKey], saneLinks[saneLinkKey])
            ) {
              handleWarning({
                mitigationType: MitigationTypes.DUPLICATE_LINK_KEY,
                message:
                  `Multiple operations with the same response body share the same sanitized ` +
                  `link key '${saneLinkKey}' but have different link definitions ` +
                  `'${JSON.stringify(existingDataDef.links[saneLinkKey])}' and ` +
                  `'${JSON.stringify(saneLinks[saneLinkKey])}'.`,
                data,
                logger: preprocessingLogger,
              });
            }
          });

          /**
           * Collapse the links
           *
           * Avoid overwriting preexisting links
           */
          existingDataDef.links = { ...saneLinks, ...existingDataDef.links };
        } else {
          // No preexisting links, so simply assign the links
          existingDataDef.links = saneLinks;
        }
      }

      return existingDataDef;
    } else {
      // Else, define a new name, store the def, and return it
      const usedNames = [...data.usedTypeNames, ...Object.keys(data.saneMap)];
      const caseStyle = data.options.simpleNames ? Oas3Tools.CaseStyle.simple : Oas3Tools.CaseStyle.PascalCase;
      const name = getSchemaName(names, usedNames as string[], caseStyle);

      // Store and sanitize the name
      let saneName = Oas3Tools.sanitize(name, caseStyle);
      saneName = Oas3Tools.storeSaneName(saneName, name, data.saneMap, logger);
      const saneInputName = Oas3Tools.capitalize(saneName + 'Input');

      /**
       * TODO: is there a better way of copying the schema object?
       *
       * Perhaps, just copy it at the root level (operation schema)
       */
      const collapsedSchema = resolveAllOf(schema, {}, data, oas, logger);

      const targetGraphQLType = Oas3Tools.getSchemaTargetGraphQLType(collapsedSchema as SchemaObject, data);

      const def: DataDefinition = {
        preferredName,

        /**
         * Note that schema may contain $ref or schema composition (e.g. allOf)
         *
         * TODO: the schema is used in getSchemaIndex, which allows us to check
         * whether a dataDef has already been created for that particular
         * schema and name pair. The look up should resolve references but
         * currently, it does not.
         */
        schema,
        required: [],
        targetGraphQLType,
        subDefinitions: undefined,
        links: saneLinks,
        graphQLTypeName: saneName,
        graphQLInputObjectTypeName: saneInputName,
      };

      // Used type names and defs of union and object types are pushed during creation
      if (targetGraphQLType === 'object' || targetGraphQLType === 'list' || targetGraphQLType === 'enum') {
        data.usedTypeNames.push(saneName);
        data.usedTypeNames.push(saneInputName);

        // Add the def to the master list
        data.defs.push(def);
      }

      // We currently only support simple cases of anyOf and oneOf
      if (
        // TODO: Should also consider if the member schema contains type data
        (Array.isArray(collapsedSchema.anyOf) && Array.isArray(collapsedSchema.oneOf)) || // anyOf and oneOf used concurrently
        hasNestedAnyOfUsage(collapsedSchema, oas) ||
        hasNestedOneOfUsage(collapsedSchema, oas)
      ) {
        handleWarning({
          mitigationType: MitigationTypes.COMBINE_SCHEMAS,
          message:
            `Schema '${JSON.stringify(schema)}' contains either both ` +
            `'anyOf' and 'oneOf' or nested 'anyOf' and 'oneOf' which ` +
            `is currently not supported.`,
          mitigationAddendum: `Use arbitrary JSON type instead.`,
          data,
          logger: preprocessingLogger,
        });

        def.targetGraphQLType = 'json';
        return def;
      }

      // oneOf will ideally be turned into a union type
      if (Array.isArray(collapsedSchema.oneOf)) {
        const oneOfDataDef = createDataDefFromOneOf(
          saneName,
          saneInputName,
          collapsedSchema,
          isInputObjectType,
          def,
          data,
          oas,
          logger
        );
        if (typeof oneOfDataDef === 'object') {
          return oneOfDataDef;
        }
      }

      /**
       * anyOf will ideally be turned into an object type
       *
       * Fields common to all member schemas will be made non-null
       */
      if (Array.isArray(collapsedSchema.anyOf)) {
        const anyOfDataDef = createDataDefFromAnyOf(
          saneName,
          saneInputName,
          collapsedSchema,
          isInputObjectType,
          def,
          data,
          oas,
          logger
        );
        if (typeof anyOfDataDef === 'object') {
          return anyOfDataDef;
        }
      }

      if (targetGraphQLType) {
        switch (targetGraphQLType) {
          case 'list':
            if (typeof collapsedSchema.items === 'object') {
              // Break schema down into component parts
              // I.e. if it is an list type, create a reference to the list item type
              // Or if it is an object type, create references to all of the field types
              const itemsSchema = collapsedSchema.items;
              let itemsName = `${name}ListItem`;

              if ('$ref' in itemsSchema) {
                itemsName = collapsedSchema.items.$ref.split('/').pop();
              }

              const subDefinition = createDataDef(
                // Is this the correct classification for this name? It does not matter in the long run.
                { fromRef: itemsName },
                itemsSchema as SchemaObject,
                isInputObjectType,
                data,
                oas,
                logger
              );

              // Add list item reference
              def.subDefinitions = subDefinition;
            }
            break;

          case 'object':
            def.subDefinitions = {};

            if (typeof collapsedSchema.properties === 'object' && Object.keys(collapsedSchema.properties).length > 0) {
              addObjectPropertiesToDataDef(def, collapsedSchema, def.required, isInputObjectType, data, oas, logger);
            } else {
              handleWarning({
                mitigationType: MitigationTypes.OBJECT_MISSING_PROPERTIES,
                message: `Schema ${JSON.stringify(schema)} does not have ` + `any properties`,
                data,
                logger: preprocessingLogger,
              });

              def.targetGraphQLType = 'json';
            }

            break;
        }
      } else {
        // No target GraphQL type

        handleWarning({
          mitigationType: MitigationTypes.UNKNOWN_TARGET_TYPE,
          message: `No GraphQL target type could be identified for schema '${JSON.stringify(schema)}'.`,
          data,
          logger: preprocessingLogger,
        });

        def.targetGraphQLType = 'json';
      }

      return def;
    }
  }
}

/**
 * Returns the index of the data definition object in the given list that
 * contains the same schema and preferred name as the given one. Returns -1 if
 * that schema could not be found.
 */
function getSchemaIndex(preferredName: string, schema: SchemaObject, dataDefs: DataDefinition[]): number {
  /**
   * TODO: instead of iterating through the whole list every time, create a
   * hashing function and store all of the DataDefinitions in a hashmap.
   */
  for (let index = 0; index < dataDefs.length; index++) {
    const def = dataDefs[index];
    /**
     * TODO: deepEquals is not sufficient. We also need to resolve references.
     * However, deepEquals should work for vast majority of cases.
     */

    if (preferredName === def.preferredName && deepEqual(schema, def.schema)) {
      return index;
    }
  }

  // The schema could not be found in the master list
  return -1;
}

/**
 * Determines the preferred name to use for schema regardless of name collisions.
 *
 * In other words, determines the ideal name for a schema.
 *
 * Similar to getSchemaName() except it does not check if the name has already
 * been taken.
 */
function getPreferredName(names: Oas3Tools.SchemaNames): string {
  if (typeof names.preferred === 'string') {
    return Oas3Tools.sanitize(names.preferred, Oas3Tools.CaseStyle.PascalCase); // CASE: preferred name already known
  } else if (typeof names.fromRef === 'string') {
    return Oas3Tools.sanitize(names.fromRef, Oas3Tools.CaseStyle.PascalCase); // CASE: name from reference
  } else if (typeof names.fromSchema === 'string') {
    return Oas3Tools.sanitize(names.fromSchema, Oas3Tools.CaseStyle.PascalCase); // CASE: name from schema (i.e., "title" property in schema)
  } else if (typeof names.fromPath === 'string') {
    return Oas3Tools.sanitize(names.fromPath, Oas3Tools.CaseStyle.PascalCase); // CASE: name from path
  } else {
    return 'PlaceholderName'; // CASE: placeholder name
  }
}

/**
 * Determines name to use for schema from previously determined schemaNames and
 * considering not reusing existing names.
 */
function getSchemaName(names: Oas3Tools.SchemaNames, usedNames: string[], caseStyle: Oas3Tools.CaseStyle): string {
  if (Object.keys(names).length === 1 && typeof names.preferred === 'string') {
    throw new Error(`Cannot create data definition without name(s), excluding the preferred name.`);
  }

  let schemaName;

  // CASE: name from reference
  if (typeof names.fromRef === 'string') {
    const saneName = Oas3Tools.sanitize(names.fromRef, caseStyle);
    if (!usedNames.includes(saneName)) {
      schemaName = names.fromRef;
    }
  }

  // CASE: name from schema (i.e., "title" property in schema)
  if (!schemaName && typeof names.fromSchema === 'string') {
    const saneName = Oas3Tools.sanitize(names.fromSchema, caseStyle);
    if (!usedNames.includes(saneName)) {
      schemaName = names.fromSchema;
    }
  }

  // CASE: name from path
  if (!schemaName && typeof names.fromPath === 'string') {
    const saneName = Oas3Tools.sanitize(names.fromPath, caseStyle);
    if (!usedNames.includes(saneName)) {
      schemaName = names.fromPath;
    }
  }

  // CASE: all names are already used - create approximate name
  if (!schemaName) {
    schemaName = Oas3Tools.sanitize(
      typeof names.fromRef === 'string'
        ? names.fromRef
        : typeof names.fromSchema === 'string'
        ? names.fromSchema
        : typeof names.fromPath === 'string'
        ? names.fromPath
        : 'PlaceholderName',
      caseStyle
    );
  }

  if (usedNames.includes(schemaName)) {
    let appendix = 2;

    /**
     * GraphQL Objects cannot share the name so if the name already exists in
     * the master list append an incremental number until the name does not
     * exist anymore.
     */
    while (usedNames.includes(`${schemaName}${appendix}`)) {
      appendix++;
    }
    schemaName = `${schemaName}${appendix}`;
  }

  return schemaName;
}

/**
 * Recursively add all of the properties of an object to the data definition
 */
function addObjectPropertiesToDataDef<TSource, TContext, TArgs>(
  def: DataDefinition,
  schema: SchemaObject,
  required: string[],
  isInputObjectType: boolean,
  data: PreprocessingData<TSource, TContext, TArgs>,
  oas: Oas3,
  logger: Logger
) {
  /**
   * Resolve all required properties
   *
   * TODO: required may contain duplicates, which is not necessarily a problem
   */
  if (Array.isArray(schema.required)) {
    schema.required.forEach(requiredProperty => {
      required.push(requiredProperty);
    });
  }

  for (const propertyKey in schema.properties) {
    let propSchemaName = propertyKey;
    let propSchema = schema.properties[propertyKey];

    if ('$ref' in propSchema) {
      propSchemaName = propSchema.$ref.split('/').pop();
      propSchema = Oas3Tools.resolveRef(propSchema.$ref, oas) as SchemaObject;
    }

    if (!(propertyKey in def.subDefinitions)) {
      const subDefinition = createDataDef(
        {
          fromRef: propSchemaName,
          fromSchema: propSchema.title, // TODO: Currently not utilized because of fromRef but arguably, propertyKey is a better field name and title is a better type name
        },
        propSchema,
        isInputObjectType,
        data,
        oas,
        logger
      );

      // Add field type references
      def.subDefinitions[propertyKey] = subDefinition;
    } else {
      const preprocessingLogger = logger.child('preprocessing');
      handleWarning({
        mitigationType: MitigationTypes.DUPLICATE_FIELD_NAME,
        message:
          `By way of resolving 'allOf', multiple schemas contain ` +
          `properties with the same name, preventing consolidation. Cannot ` +
          `add property '${propertyKey}' from schema '${JSON.stringify(schema)}' ` +
          `to dataDefinition '${JSON.stringify(def)}'`,
        data,
        logger: preprocessingLogger,
      });
    }
  }
}

/**
 * Recursively traverse a schema and resolve allOf by appending the data to the
 * parent schema
 */
function resolveAllOf<TSource, TContext, TArgs>(
  schema: SchemaObject | ReferenceObject,
  references: { [reference: string]: SchemaObject },
  data: PreprocessingData<TSource, TContext, TArgs>,
  oas: Oas3,
  logger: Logger
): SchemaObject {
  const preprocessingLogger = logger.child('preprocessing');
  // Dereference schema
  if ('$ref' in schema) {
    const referenceLocation = schema.$ref;
    schema = Oas3Tools.resolveRef(schema.$ref, oas) as SchemaObject;

    if (referenceLocation in references) {
      return references[referenceLocation];
    } else {
      // Store references in case of circular allOf
      references[referenceLocation] = schema;
    }
  }

  const collapsedSchema: SchemaObject = JSON.parse(JSON.stringify(schema));

  // Resolve allOf
  if (Array.isArray(collapsedSchema.allOf)) {
    collapsedSchema.allOf.forEach(memberSchema => {
      // Collapse type if applicable
      const resolvedSchema = resolveAllOf(memberSchema, references, data, oas, logger);

      if (resolvedSchema.type) {
        if (!collapsedSchema.type) {
          collapsedSchema.type = resolvedSchema.type;

          // Add type if applicable
        } else if (collapsedSchema.type !== resolvedSchema.type) {
          // Incompatible schema type

          handleWarning({
            mitigationType: MitigationTypes.UNRESOLVABLE_SCHEMA,
            message:
              `Resolving 'allOf' field in schema '${collapsedSchema}' ` +
              `results in incompatible schema type from partial schema '${resolvedSchema}'.`,
            data,
            logger: preprocessingLogger,
          });
        }
      }

      // Collapse properties if applicable
      if ('properties' in resolvedSchema) {
        if (!('properties' in collapsedSchema)) {
          collapsedSchema.properties = {};
        }

        Object.entries(resolvedSchema.properties).forEach(([propertyName, property]) => {
          if (propertyName in collapsedSchema) {
            // Conflicting property

            handleWarning({
              mitigationType: MitigationTypes.UNRESOLVABLE_SCHEMA,
              message:
                `Resolving 'allOf' field in schema '${collapsedSchema}' ` +
                `results in incompatible property field from partial schema '${resolvedSchema}'.`,
              data,
              logger: preprocessingLogger,
            });
          } else {
            collapsedSchema.properties[propertyName] = property;
          }
        });
      }

      // Collapse oneOf if applicable
      if ('oneOf' in resolvedSchema) {
        if (!('oneOf' in collapsedSchema)) {
          collapsedSchema.oneOf = [];
        }

        resolvedSchema.oneOf.forEach(oneOfProperty => {
          collapsedSchema.oneOf.push(oneOfProperty);
        });
      }

      // Collapse anyOf if applicable
      if ('anyOf' in resolvedSchema) {
        if (!('anyOf' in collapsedSchema)) {
          collapsedSchema.anyOf = [];
        }

        resolvedSchema.anyOf.forEach(anyOfProperty => {
          collapsedSchema.anyOf.push(anyOfProperty);
        });
      }

      // Collapse required if applicable
      if ('required' in resolvedSchema) {
        if (!('required' in collapsedSchema)) {
          collapsedSchema.required = [];
        }

        resolvedSchema.required.forEach(requiredProperty => {
          if (!collapsedSchema.required.includes(requiredProperty)) {
            collapsedSchema.required.push(requiredProperty);
          }
        });
      }
    });
  }

  return collapsedSchema;
}

type MemberSchemaData = {
  allTargetGraphQLTypes: string[];
  allProperties: { [key: string]: SchemaObject | ReferenceObject }[];
  allRequired: string[];
};

/**
 * In the context of schemas that use keywords that combine member schemas,
 * collect data on certain aspects so it is all in one place for processing.
 */
function getMemberSchemaData<TSource, TContext, TArgs>(
  schemas: (SchemaObject | ReferenceObject)[],
  data: PreprocessingData<TSource, TContext, TArgs>,
  oas: Oas3
): MemberSchemaData {
  const result: MemberSchemaData = {
    allTargetGraphQLTypes: [],
    allProperties: [],
    allRequired: [],
  };

  schemas.forEach(schema => {
    // Dereference schemas
    if ('$ref' in schema) {
      schema = Oas3Tools.resolveRef(schema.$ref, oas) as SchemaObject;
    }

    // Consolidate target GraphQL type
    const memberTargetGraphQLType = Oas3Tools.getSchemaTargetGraphQLType(schema, data);
    if (memberTargetGraphQLType) {
      result.allTargetGraphQLTypes.push(memberTargetGraphQLType);
    }

    // Consolidate properties
    if (schema.properties) {
      result.allProperties.push(schema.properties);
    }

    // Consolidate required
    if (schema.required) {
      result.allRequired = result.allRequired.concat(schema.required);
    }
  });

  return result;
}

/**
 * Check to see if there are cases of nested oneOf fields in the member schemas
 *
 * We currently cannot handle complex cases of oneOf and anyOf
 */
function hasNestedOneOfUsage(collapsedSchema: SchemaObject, oas: Oas3): boolean {
  // TODO: Should also consider if the member schema contains type data
  return (
    Array.isArray(collapsedSchema.oneOf) &&
    collapsedSchema.oneOf.some(memberSchema => {
      // anyOf and oneOf are nested
      if ('$ref' in memberSchema) {
        memberSchema = Oas3Tools.resolveRef(memberSchema.$ref, oas) as SchemaObject;
      }

      return (
        Array.isArray(memberSchema.anyOf) || Array.isArray(memberSchema.oneOf) // Nested oneOf would result in nested unions which are not allowed by GraphQL
      );
    })
  );
}

/**
 * Check to see if there are cases of nested anyOf fields in the member schemas
 *
 * We currently cannot handle complex cases of oneOf and anyOf
 */
function hasNestedAnyOfUsage(collapsedSchema: SchemaObject, oas: Oas3): boolean {
  // TODO: Should also consider if the member schema contains type data
  return (
    Array.isArray(collapsedSchema.anyOf) &&
    collapsedSchema.anyOf.some(memberSchema => {
      // anyOf and oneOf are nested
      if ('$ref' in memberSchema) {
        memberSchema = Oas3Tools.resolveRef(memberSchema.$ref, oas) as SchemaObject;
      }

      return Array.isArray(memberSchema.anyOf) || Array.isArray(memberSchema.oneOf);
    })
  );
}

/**
 * Create a data definition for anyOf is applicable
 *
 * anyOf should resolve into an object that contains the superset of all
 * properties from the member schemas
 */
function createDataDefFromAnyOf<TSource, TContext, TArgs>(
  saneName: string,
  saneInputName: string,
  collapsedSchema: SchemaObject,
  isInputObjectType: boolean,
  def: DataDefinition,
  data: PreprocessingData<TSource, TContext, TArgs>,
  oas: Oas3,
  logger: Logger
): DataDefinition | void {
  const preprocessingLogger = logger.child('preprocessing');
  const anyOfData = getMemberSchemaData(collapsedSchema.anyOf, data, oas);

  if (
    anyOfData.allTargetGraphQLTypes.some(memberTargetGraphQLType => {
      return memberTargetGraphQLType === 'object';
    })
  ) {
    // Every member type should be an object
    if (
      anyOfData.allTargetGraphQLTypes.every(memberTargetGraphQLType => {
        return memberTargetGraphQLType === 'object';
      }) &&
      anyOfData.allProperties.length > 0 // Redundant check
    ) {
      // Ensure that parent schema is compatible with oneOf
      if (def.targetGraphQLType === null || def.targetGraphQLType === 'object') {
        const allProperties: {
          [propertyName: string]: (SchemaObject | ReferenceObject)[];
        } = {};
        const incompatibleProperties = new Set<string>();

        /**
         * TODO: Check for consistent properties across all member schemas and
         * make them into non-nullable properties by manipulating the
         * required field
         */

        if (typeof collapsedSchema.properties === 'object') {
          Object.keys(collapsedSchema.properties).forEach(propertyName => {
            allProperties[propertyName] = [collapsedSchema.properties[propertyName]];
          });
        }

        // Check if any member schema has conflicting properties
        anyOfData.allProperties.forEach(properties => {
          Object.keys(properties).forEach(propertyName => {
            if (
              !incompatibleProperties.has(propertyName.toString()) && // Has not been already identified as a problematic property
              typeof allProperties[propertyName] === 'object' &&
              allProperties[propertyName].some(property => {
                // Property does not match a recorded one
                return !deepEqual(property, properties[propertyName]);
              })
            ) {
              incompatibleProperties.add(propertyName.toString());
            }

            // Add property in the store
            if (!(propertyName in allProperties)) {
              allProperties[propertyName] = [];
            }
            allProperties[propertyName].push(properties[propertyName]);
          });
        });

        def.subDefinitions = {};

        if (typeof collapsedSchema.properties === 'object' && Object.keys(collapsedSchema.properties).length > 0) {
          addObjectPropertiesToDataDef(def, collapsedSchema, def.required, isInputObjectType, data, oas, logger);
        }

        anyOfData.allProperties.forEach(properties => {
          Object.keys(properties).forEach(propertyName => {
            if (!incompatibleProperties.has(propertyName.toString())) {
              // Dereferenced by processing anyOfData
              const propertySchema = properties[propertyName] as SchemaObject;

              const subDefinition = createDataDef(
                {
                  fromRef: propertyName.toString(),
                  fromSchema: propertySchema.title, // TODO: Currently not utilized because of fromRef but arguably, propertyKey is a better field name and title is a better type name
                },
                propertySchema,
                isInputObjectType,
                data,
                oas,
                logger
              );

              /**
               * Add field type references
               * There should not be any collisions
               */
              def.subDefinitions[propertyName] = subDefinition;
            }
          });
        });

        // Add in incompatible properties
        incompatibleProperties.forEach(propertyName => {
          // TODO: add description
          def.subDefinitions[propertyName] = {
            targetGraphQLType: 'json',
          };
        });

        data.usedTypeNames.push(saneName);
        data.usedTypeNames.push(saneInputName);

        data.defs.push(def);

        def.targetGraphQLType = 'object';
        return def;
      } else {
        // The parent schema is incompatible with the member schemas

        handleWarning({
          mitigationType: MitigationTypes.COMBINE_SCHEMAS,
          message:
            `Schema '${inspect(def.schema)}' contains 'anyOf' and ` +
            `some member schemas are object types so create a GraphQL ` +
            `object type but the parent schema is a non-object type ` +
            `so they are not compatible.`,
          mitigationAddendum: `Use arbitrary JSON type instead.`,
          data,
          logger: preprocessingLogger,
        });

        def.targetGraphQLType = 'json';
        return def;
      }
    } else {
      // The member schemas are not all object types

      handleWarning({
        mitigationType: MitigationTypes.COMBINE_SCHEMAS,
        message:
          `Schema '${inspect(def.schema)}' contains 'anyOf' and ` +
          `some member schemas are object types so create a GraphQL ` +
          `object type but some member schemas are non-object types ` +
          `so they are not compatible.`,
        data,
        logger: preprocessingLogger,
      });

      def.targetGraphQLType = 'json';
      return def;
    }
  }
}

function createDataDefFromOneOf<TSource, TContext, TArgs>(
  saneName: string,
  saneInputName: string,
  collapsedSchema: SchemaObject,
  isInputObjectType: boolean,
  def: DataDefinition,
  data: PreprocessingData<TSource, TContext, TArgs>,
  oas: Oas3,
  logger: Logger
): DataDefinition | void {
  const preprocessingLogger = logger.child('preprocessing');
  const oneOfData = getMemberSchemaData(collapsedSchema.oneOf, data, oas);

  if (
    oneOfData.allTargetGraphQLTypes.some(memberTargetGraphQLType => {
      return memberTargetGraphQLType === 'object';
    })
  ) {
    // unions must be created from object types
    if (
      oneOfData.allTargetGraphQLTypes.every(memberTargetGraphQLType => {
        return memberTargetGraphQLType === 'object';
      }) &&
      oneOfData.allProperties.length > 0 // Redundant check
    ) {
      // Input object types cannot be composed of unions
      if (isInputObjectType) {
        handleWarning({
          mitigationType: MitigationTypes.INPUT_UNION,
          message: `Input object types cannot be composed of union types.`,
          data,
          logger: preprocessingLogger,
        });

        def.targetGraphQLType = 'json';
        return def;
      }

      // Ensure that parent schema is compatible with oneOf
      if (def.targetGraphQLType === null || def.targetGraphQLType === 'object') {
        def.subDefinitions = [];

        collapsedSchema.oneOf.forEach(memberSchema => {
          // Dereference member schema
          let fromRef: string;
          if ('$ref' in memberSchema) {
            fromRef = memberSchema.$ref.split('/').pop();
            memberSchema = Oas3Tools.resolveRef(memberSchema.$ref, oas) as SchemaObject;
          }

          // Member types of GraphQL unions must be object types
          if (Oas3Tools.getSchemaTargetGraphQLType(memberSchema, data) === 'object') {
            const subDefinition = createDataDef(
              {
                fromRef,
                fromSchema: memberSchema.title,
                fromPath: `${saneName}Member`,
              },
              memberSchema,
              isInputObjectType,
              data,
              oas,
              logger
            );
            (def.subDefinitions as DataDefinition[]).push(subDefinition);
          } else {
            handleWarning({
              mitigationType: MitigationTypes.COMBINE_SCHEMAS,
              message:
                `Schema '${JSON.stringify(def.schema)}' contains 'oneOf' so ` +
                `create a GraphQL union type but member schema '${JSON.stringify(memberSchema)}' ` +
                `is not an object type and union member types must be ` +
                `object base types.`,
              data,
              logger: preprocessingLogger,
            });
          }
        });

        // Not all member schemas may have been turned into GraphQL member types
        if (
          def.subDefinitions.length > 0 &&
          def.subDefinitions.every(subDefinition => {
            return subDefinition.targetGraphQLType === 'object';
          })
        ) {
          // Ensure all member schemas have been verified as object types
          data.usedTypeNames.push(saneName);
          data.usedTypeNames.push(saneInputName);

          data.defs.push(def);

          def.targetGraphQLType = 'union';
          return def;
        } else {
          handleWarning({
            mitigationType: MitigationTypes.COMBINE_SCHEMAS,
            message:
              `Schema '${JSON.stringify(def.schema)}' contains 'oneOf' so ` +
              `create a GraphQL union type but all member schemas are not` +
              `object types and union member types must be object types.`,
            mitigationAddendum: `Use arbitrary JSON type instead.`,
            data,
            logger: preprocessingLogger,
          });

          // Default arbitrary JSON type
          def.targetGraphQLType = 'json';
          return def;
        }
      } else {
        // The parent schema is incompatible with the member schemas

        handleWarning({
          mitigationType: MitigationTypes.COMBINE_SCHEMAS,
          message:
            `Schema '${JSON.stringify(def.schema)}' contains 'oneOf' so create ` +
            `a GraphQL union type but the parent schema is a non-object ` +
            `type and member types must be object types.`,
          mitigationAddendum: `Use arbitrary JSON type instead.`,
          data,
          logger: preprocessingLogger,
        });

        def.targetGraphQLType = 'json';
        return def;
      }
    } else {
      // The member schemas are not all object types

      handleWarning({
        mitigationType: MitigationTypes.COMBINE_SCHEMAS,
        message:
          `Schema '${JSON.stringify(def.schema)}' contains 'oneOf' so create ` +
          `a GraphQL union type but some member schemas are non-object ` +
          `types and union member types must be object types.`,
        mitigationAddendum: `Use arbitrary JSON type instead.`,
        data,
        logger: preprocessingLogger,
      });

      def.targetGraphQLType = 'json';
      return def;
    }
  }
}
