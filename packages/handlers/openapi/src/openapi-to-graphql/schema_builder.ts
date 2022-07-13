/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-case-declarations */
/* eslint-disable no-useless-return */
/* eslint-disable no-dupe-else-if */
// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * Functions to translate JSON schema to GraphQL (input) object types.
 */

// Type imports:
import { PreprocessingData } from './types/preprocessing_data';
import { Operation, DataDefinition } from './types/operation';
import { Oas3, SchemaObject, ParameterObject, ReferenceObject, LinkObject } from './types/oas3';
import { Args, GraphQLType } from './types/graphql';
import {
  GraphQLScalarType,
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLUnionType,
  GraphQLInputFieldConfigMap,
} from 'graphql';

// Imports:
import { GraphQLJSON, GraphQLBigInt, GraphQLDateTime } from 'graphql-scalars';
import * as Oas3Tools from './oas_3_tools';
import { getResolver } from './resolver_builder';
import { createDataDef } from './preprocessor';
import { handleWarning, sortObject, MitigationTypes } from './utils';
import { Logger } from '@graphql-mesh/types';

type GetArgsParams<TSource, TContext, TArgs> = {
  requestPayloadDef?: DataDefinition;
  parameters: ParameterObject[];
  operation?: Operation;
  data: PreprocessingData<TSource, TContext, TArgs>;
  includeHttpDetails: boolean;
  logger: Logger;
};

type CreateOrReuseComplexTypeParams<TSource, TContext, TArgs> = {
  def: DataDefinition;
  operation?: Operation;
  iteration?: number; // Count of recursions used to create type
  isInputObjectType?: boolean; // Does not require isInputObjectType because unions must be composed of objects
  data: PreprocessingData<TSource, TContext, TArgs>; // Data produced by preprocessing
  includeHttpDetails: boolean;
  logger: Logger;
};

type CreateOrReuseSimpleTypeParams<TSource, TContext, TArgs> = {
  def: DataDefinition;
  data: PreprocessingData<TSource, TContext, TArgs>;
  logger: Logger;
};

type CreateFieldsParams<TSource, TContext, TArgs> = {
  def: DataDefinition;
  links: { [key: string]: LinkObject };
  operation: Operation;
  iteration: number;
  isInputObjectType: boolean;
  data: PreprocessingData<TSource, TContext, TArgs>;
  includeHttpDetails: boolean;
  logger: Logger;
};

type LinkOpRefToOpIdParams<TSource, TContext, TArgs> = {
  links: { [key: string]: LinkObject };
  linkKey: string;
  operation: Operation;
  data: PreprocessingData<TSource, TContext, TArgs>;
  logger: Logger;
};

/**
 * Creates and returns a GraphQL type for the given JSON schema.
 */
export function getGraphQLType<TSource, TContext, TArgs>({
  def,
  operation,
  data,
  iteration = 0,
  isInputObjectType = false,
  includeHttpDetails = false,
  logger,
}: CreateOrReuseComplexTypeParams<TSource, TContext, TArgs>): GraphQLType {
  const name = isInputObjectType ? def.graphQLInputObjectTypeName : def.graphQLTypeName;

  // Avoid excessive iterations
  if (iteration === 50) {
    throw new Error(`GraphQL type ${name} has excessive nesting of other types`);
  }

  switch (def.targetGraphQLType) {
    // CASE: object - create object type
    case 'object':
      return createOrReuseOt({
        def,
        operation,
        data,
        iteration,
        isInputObjectType,
        includeHttpDetails,
        logger,
      });

    // CASE: union - create union type
    case 'union':
      return createOrReuseUnion({
        def,
        operation,
        data,
        iteration,
        includeHttpDetails,
        logger,
      });

    // CASE: list - create list type
    case 'list':
      return createOrReuseList({
        def,
        operation,
        data,
        iteration,
        isInputObjectType,
        includeHttpDetails,
        logger,
      });

    // CASE: enum - create enum type
    case 'enum':
      return createOrReuseEnum({
        def,
        data,
        logger,
      });

    // CASE: scalar - return scalar type
    default:
      return getScalarType({
        def,
        data,
        logger,
      });
  }
}

/**
 * Creates an (input) object type or return an existing one, and stores it
 * in data
 *
 * A returned GraphQLObjectType has the following internal structure:
 *
 *   new GraphQLObjectType({
 *     name        // Optional name of the type
 *     description // Optional description of type
 *     fields      // REQUIRED returning fields
 *       type      // REQUIRED definition of the field type
 *       args      // Optional definition of types
 *       resolve   // Optional function defining how to obtain this type
 *   })
 */
function createOrReuseOt<TSource, TContext, TArgs>({
  def,
  operation,
  data,
  iteration,
  isInputObjectType,
  includeHttpDetails,
  logger,
}: CreateOrReuseComplexTypeParams<TSource, TContext, TArgs>):
  | GraphQLObjectType
  | GraphQLInputObjectType
  | GraphQLScalarType {
  const translationLogger = logger.child('translation');
  // Try to reuse a preexisting (input) object type

  // CASE: query - reuse object type
  if (!isInputObjectType) {
    if (def.graphQLType && typeof def.graphQLType !== 'undefined') {
      translationLogger.debug(
        () =>
          `Reuse object type '${def.graphQLTypeName}'` +
          (typeof operation === 'object' ? ` (for operation '${operation.operationString}')` : '')
      );

      return def.graphQLType as GraphQLObjectType | GraphQLInputObjectType | GraphQLScalarType;
    }

    // CASE: mutation - reuse input object type
  } else {
    if (def.graphQLInputObjectType && typeof def.graphQLInputObjectType !== 'undefined') {
      translationLogger.debug(
        () =>
          `Reuse input object type '${def.graphQLInputObjectTypeName}'` +
          (typeof operation === 'object' ? ` (for operation '${operation.operationString}')` : '')
      );
      return def.graphQLInputObjectType as GraphQLInputObjectType;
    }
  }

  // Cannot reuse preexisting (input) object type, therefore create one

  const schema = def.schema;
  const description = schema.description;

  // CASE: query - create object type
  if (!isInputObjectType) {
    translationLogger.debug(
      () =>
        `Create object type '${def.graphQLTypeName}'` +
        (typeof operation === 'object' ? ` (for operation '${operation.operationString}')` : '')
    );

    def.graphQLType = new GraphQLObjectType({
      name: def.graphQLTypeName,
      description,
      fields: () => {
        return createFields({
          def,
          links: def.links,
          operation,
          data,
          iteration,
          isInputObjectType: false,
          includeHttpDetails,
          logger,
        }) as GraphQLFieldConfigMap<TSource, TContext>;
      },
    });

    return def.graphQLType;

    // CASE: mutation - create input object type
  } else {
    translationLogger.debug(
      () =>
        `Create input object type '${def.graphQLInputObjectTypeName}'` +
        (typeof operation === 'object' ? ` (for operation '${operation.operationString}')` : '')
    );

    def.graphQLInputObjectType = new GraphQLInputObjectType({
      name: def.graphQLInputObjectTypeName,
      description,
      fields: () => {
        return createFields({
          def,
          links: {},
          operation,
          data,
          iteration,
          isInputObjectType: true,
          includeHttpDetails,
          logger,
        }) as GraphQLInputFieldConfigMap;
      },
    });

    return def.graphQLInputObjectType;
  }
}

/**
 * Creates a union type or return an existing one, and stores it in data
 */
function createOrReuseUnion<TSource, TContext, TArgs>({
  def,
  operation,
  data,
  iteration,
  includeHttpDetails,
  logger,
}: CreateOrReuseComplexTypeParams<TSource, TContext, TArgs>): GraphQLUnionType {
  const translationLogger = logger.child('translation');
  // Try to reuse existing union type
  if (typeof def.graphQLType !== 'undefined') {
    translationLogger.debug(
      () =>
        `Reuse union type '${def.graphQLTypeName}'` +
        (typeof operation === 'object' ? ` (for operation '${operation.operationString}')` : '')
    );
    return def.graphQLType as GraphQLUnionType;
  } else {
    translationLogger.debug(
      () =>
        `Create union type '${def.graphQLTypeName}'` +
        (typeof operation === 'object' ? ` (for operation '${operation.operationString}')` : '')
    );

    const schema = def.schema;

    const description = typeof schema.description !== 'undefined' ? schema.description : 'No description available.';

    const memberTypeDefinitions = def.subDefinitions as DataDefinition[];

    const types = Object.values(memberTypeDefinitions).map(memberTypeDefinition => {
      return getGraphQLType({
        def: memberTypeDefinition,
        operation,
        data,
        iteration: iteration + 1,
        isInputObjectType: false,
        includeHttpDetails,
        logger,
      }) as GraphQLObjectType;
    });

    /**
     * Check for ambiguous member types
     *
     * i.e. member types that can be confused with each other.
     */
    checkAmbiguousMemberTypes(def, types, data, logger);

    def.graphQLType = new GraphQLUnionType({
      name: def.graphQLTypeName,
      description,
      types,
      resolveType: (source, context, info) => {
        const properties = Object.keys(source)
          // Remove custom _openAPIToGraphQL property used to pass data
          .filter(property => property !== '_openAPIToGraphQL');

        /**
         * Find appropriate member type
         *
         * TODO: currently, the check is performed by only checking the property
         * names. In the future, we should also check the types of those
         * properties.
         *
         * TODO: there is a chance a that an intended member type cannot be
         * identified if, for whatever reason, the return data is a superset
         * of the fields specified in the OAS
         */
        return types.find(type => {
          const typeFields = Object.keys(type.getFields());

          // The type should be a superset of the properties
          if (properties.length <= typeFields.length) {
            return properties.every(property => typeFields.includes(property.toString()));
          }

          return false;
        })?.name;
      },
    });

    return def.graphQLType;
  }
}

/**
 * Check for ambiguous member types
 *
 * i.e. member types that can be confused with each other.
 */
function checkAmbiguousMemberTypes<TSource, TContext, TArgs>(
  def: DataDefinition,
  types: GraphQLObjectType[],
  data: PreprocessingData<TSource, TContext, TArgs>,
  logger: Logger
): void {
  const translationLogger = logger.child('translation');
  types.sort((a, b) => {
    const aFieldLength = Object.keys(a.getFields()).length;
    const bFieldLength = Object.keys(b.getFields()).length;

    if (aFieldLength < bFieldLength) {
      return -1;
    } else if (aFieldLength < bFieldLength) {
      return 1;
    } else {
      return 0;
    }
  });

  for (let i = 0; i < types.length - 1; i++) {
    const currentType = types[i];

    for (let j = i + 1; j < types.length; j++) {
      const otherType = types[j];

      // TODO: Check the value, not just the field name
      if (
        Object.keys(currentType.getFields()).every(field => {
          return Object.keys(otherType.getFields()).includes(field);
        })
      ) {
        handleWarning({
          mitigationType: MitigationTypes.AMBIGUOUS_UNION_MEMBERS,
          message:
            `Union created from schema '${JSON.stringify(def.schema)}' contains ` +
            `member types such as '${currentType}' and '${otherType}' ` +
            `which are ambiguous. Ambiguous member types can cause ` +
            `problems when trying to resolve types.`,
          data,
          logger: translationLogger,
        });

        return;
      }
    }
  }
}

/**
 * Creates a list type or returns an existing one, and stores it in data
 */
function createOrReuseList<TSource, TContext, TArgs>({
  def,
  operation,
  iteration,
  isInputObjectType,
  data,
  includeHttpDetails,
  logger,
}: CreateOrReuseComplexTypeParams<TSource, TContext, TArgs>): GraphQLList<any> {
  const translationLogger = logger.child('translation');
  const name = isInputObjectType ? def.graphQLInputObjectTypeName : def.graphQLTypeName;

  // Try to reuse existing Object Type
  if (!isInputObjectType && def.graphQLType && typeof def.graphQLType !== 'undefined') {
    translationLogger.debug(`Reuse GraphQLList '${def.graphQLTypeName}'`);
    return def.graphQLType as GraphQLList<any>;
  } else if (isInputObjectType && def.graphQLInputObjectType && typeof def.graphQLInputObjectType !== 'undefined') {
    translationLogger.debug(`Reuse GraphQLList '${def.graphQLInputObjectTypeName}'`);
    return def.graphQLInputObjectType as GraphQLList<any>;
  }

  // Create new List Object Type
  translationLogger.debug(`Create GraphQLList '${def.graphQLTypeName}'`);

  // Get definition of the list item, which should be in the sub definitions
  const itemDef = def.subDefinitions as DataDefinition;

  // Equivalent to schema.items
  const itemsSchema = itemDef.schema;
  // Equivalent to `{name}ListItem`
  const itemsName = itemDef.graphQLTypeName;

  const itemsType = getGraphQLType({
    def: itemDef,
    data,
    operation,
    iteration: iteration + 1,
    isInputObjectType,
    includeHttpDetails,
    logger,
  });

  if (itemsType !== null) {
    const listObjectType = new GraphQLList(itemsType);

    // Store newly created list type
    if (!isInputObjectType) {
      def.graphQLType = listObjectType;
    } else {
      def.graphQLInputObjectType = listObjectType;
    }
    return listObjectType;
  } else {
    throw new Error(`Cannot create list item object type '${itemsName}' in list
    '${name}' with schema '${JSON.stringify(itemsSchema)}'`);
  }
}

/**
 * Creates an enum type or returns an existing one, and stores it in data
 */
function createOrReuseEnum<TSource, TContext, TArgs>({
  def,
  logger,
}: CreateOrReuseSimpleTypeParams<TSource, TContext, TArgs>): GraphQLEnumType {
  const translationLogger = logger.child('translation');
  /**
   * Try to reuse existing enum type
   *
   * Enum types do not have an input variant so only check def.ot
   */
  if (def.graphQLType && typeof def.graphQLType !== 'undefined') {
    translationLogger.debug(`Reuse GraphQLEnumType '${def.graphQLTypeName}'`);
    return def.graphQLType as GraphQLEnumType;
  } else {
    translationLogger.debug(`Create GraphQLEnumType '${def.graphQLTypeName}'`);

    const values = {};
    def.schema.enum.forEach(e => {
      // Force enum values to string and value should be in ALL_CAPS
      values[Oas3Tools.sanitize(e.toString(), Oas3Tools.CaseStyle.ALL_CAPS)] = {
        value: e,
      };
    });

    // Store newly created Enum Object Type
    def.graphQLType = new GraphQLEnumType({
      name: def.graphQLTypeName,
      values,
    });

    return def.graphQLType;
  }
}

/**
 * Returns the GraphQL scalar type matching the given JSON schema type
 */
function getScalarType<TSource, TContext, TArgs>({
  def,
  data,
}: CreateOrReuseSimpleTypeParams<TSource, TContext, TArgs>): GraphQLScalarType {
  switch (def.targetGraphQLType) {
    case 'id':
      def.graphQLType = GraphQLID;
      break;
    case 'string':
      def.graphQLType = GraphQLString;
      break;
    case 'integer':
      def.graphQLType = GraphQLInt;
      break;
    case 'int64':
      def.graphQLType = GraphQLBigInt;
      break;
    case 'number':
      def.graphQLType = GraphQLFloat;
      break;
    case 'float':
      def.graphQLType = GraphQLFloat;
      break;
    case 'boolean':
      def.graphQLType = GraphQLBoolean;
      break;
    case 'json':
      def.graphQLType = GraphQLJSON;
      break;
    case 'dateTime':
      def.graphQLType = GraphQLDateTime;
      break;
    default:
      throw new Error(`Cannot process schema type '${def.targetGraphQLType}'.`);
  }

  return def.graphQLType as GraphQLScalarType;
}

/**
 * Creates the fields object to be used by an (input) object type
 */
function createFields<TSource, TContext, TArgs>({
  def,
  links,
  operation,
  data,
  iteration,
  isInputObjectType,
  includeHttpDetails,
  logger,
}: CreateFieldsParams<TSource, TContext, TArgs>): GraphQLFieldConfigMap<any, any> | GraphQLInputFieldConfigMap {
  const translationLogger = logger.child('translation');

  let fields: GraphQLFieldConfigMap<any, any> = {};

  if (includeHttpDetails && !isInputObjectType) {
    fields.httpDetails = {
      type: GraphQLJSON,
      resolve: root => root?._openAPIToGraphQL?.data,
    };
  }

  const fieldTypeDefinitions = def.subDefinitions as {
    [fieldName: string]: DataDefinition;
  };

  // Create fields for properties
  for (const fieldTypeKey in fieldTypeDefinitions) {
    const fieldTypeDefinition = fieldTypeDefinitions[fieldTypeKey];
    const fieldSchema = fieldTypeDefinition.schema;

    // Get object type describing the property
    const objectType = getGraphQLType({
      def: fieldTypeDefinition,
      operation,
      data,
      iteration: iteration + 1,
      isInputObjectType,
      includeHttpDetails,
      logger,
    });

    const requiredProperty =
      typeof def.required === 'object' && def.required.includes(fieldTypeKey) && !fieldTypeDefinition.schema.nullable;

    // Finally, add the object type to the fields (using sanitized field name)
    if (objectType) {
      const saneFieldTypeKey = Oas3Tools.sanitize(
        fieldTypeKey,
        !data.options.simpleNames ? Oas3Tools.CaseStyle.camelCase : Oas3Tools.CaseStyle.simple
      );

      const sanePropName = Oas3Tools.storeSaneName(saneFieldTypeKey, fieldTypeKey, data.saneMap, logger);

      fields[sanePropName] = {
        type: (requiredProperty ? new GraphQLNonNull(objectType) : objectType) as GraphQLOutputType,

        description: typeof fieldSchema === 'object' ? fieldSchema.description : null,
      };
    } else {
      handleWarning({
        mitigationType: MitigationTypes.CANNOT_GET_FIELD_TYPE,
        message:
          `Cannot obtain GraphQL type for field '${fieldTypeKey}' in ` +
          `GraphQL type '${JSON.stringify(def.schema)}'.`,
        data,
        logger: translationLogger,
      });
    }
  }

  if (
    typeof links === 'object' && // Links are present
    !isInputObjectType // Only object type (input object types cannot make use of links)
  ) {
    for (const saneLinkKey in links) {
      translationLogger.debug(`Create link '${saneLinkKey}'...`);

      // Check if key is already in fields
      if (saneLinkKey in fields) {
        handleWarning({
          mitigationType: MitigationTypes.LINK_NAME_COLLISION,
          message:
            `Cannot create link '${saneLinkKey}' because parent ` +
            `object type already contains a field with the same (sanitized) name.`,
          data,
          logger: translationLogger,
        });
      } else {
        const link = links[saneLinkKey];

        // Get linked operation
        let linkedOpId;
        // TODO: href is yet another alternative to operationRef and operationId
        if (typeof link.operationId === 'string') {
          linkedOpId = link.operationId;
        } else if (typeof link.operationRef === 'string') {
          linkedOpId = linkOpRefToOpId({
            links,
            linkKey: saneLinkKey,
            operation,
            data,
            logger,
          });
        }

        /**
         * linkedOpId may not be initialized because operationRef may lead to an
         * operation object that does not have an operationId
         */
        if (typeof linkedOpId === 'string' && linkedOpId in data.operations) {
          const linkedOp = data.operations[linkedOpId];

          // Determine parameters provided via link
          const argsFromLink = link.parameters;

          // Get arguments that are not provided by the linked operation
          let dynamicParams = linkedOp.parameters;
          if (typeof argsFromLink === 'object') {
            dynamicParams = dynamicParams.filter(param => {
              return typeof argsFromLink[param.name] === 'undefined';
            });
          }

          // Get resolve function for link
          const linkResolver = data.options.resolverMiddleware(
            () => ({
              operation: linkedOp,
              argsFromLink: argsFromLink as { [key: string]: string },
              data,
              baseUrl: data.options.baseUrl,
              requestOptions: data.options.requestOptions,
              logger,
            }),
            getResolver
          );

          // Get arguments for link
          const args = getArgs({
            parameters: dynamicParams,
            operation: linkedOp,
            data,
            includeHttpDetails,
            logger,
          });

          // Get response object type
          const resObjectType =
            linkedOp.responseDefinition.graphQLType !== undefined
              ? linkedOp.responseDefinition.graphQLType
              : getGraphQLType({
                  def: linkedOp.responseDefinition,
                  operation,
                  data,
                  iteration: iteration + 1,
                  isInputObjectType: false,
                  includeHttpDetails,
                  logger,
                });

          let description = link.description;

          if (data.options.equivalentToMessages && description) {
            description += `\n\nEquivalent to ${linkedOp.operationString}`;
          }

          // Finally, add the object type to the fields (using sanitized field name)
          // TODO: check if fields already has this field name
          fields[saneLinkKey] = {
            type: resObjectType as GraphQLOutputType,
            resolve: linkResolver,
            args,
            description,
          };
        } else {
          handleWarning({
            mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
            message: `Cannot resolve target of link '${saneLinkKey}'`,
            data,
            logger: translationLogger,
          });
        }
      }
    }
  }

  fields = sortObject(fields);
  return fields;
}

/**
 * Returns the operationId that an operationRef is associated to
 *
 * NOTE: If the operation does not natively have operationId, this function
 * will try to produce an operationId the same way preprocessor.js does it.
 *
 * Any changes to constructing operationIds in preprocessor.js should be
 * reflected here.
 */
function linkOpRefToOpId<TSource, TContext, TArgs>({
  links,
  linkKey,
  operation,
  data,
  logger,
}: LinkOpRefToOpIdParams<TSource, TContext, TArgs>): string | void {
  const translationLogger = logger.child('translation');

  const link = links[linkKey];

  if (typeof link.operationRef === 'string') {
    // TODO: external refs

    const operationRef = link.operationRef;
    let linkLocation;
    let linkRelativePathAndMethod;

    /**
     * Example relative path: '#/paths/~12.0~1repositories~1{username}/get'
     * Example absolute path: 'https://na2.gigantic-server.com/#/paths/~12.0~1repositories~1{username}/get'
     * Extract relative path from relative path
     */
    if (operationRef.substring(0, 8) === '#/paths/') {
      linkRelativePathAndMethod = operationRef;

      // Extract relative path from absolute path
    } else {
      /**
       * '#' may exist in other places in the path
       * '/#/' is more likely to point to the beginning of the path
       */
      const firstPathIndex = operationRef.indexOf('#/paths/');

      // Found a relative path candidate
      if (firstPathIndex !== -1) {
        // Check to see if there are other relative path candidates
        const lastPathIndex = operationRef.lastIndexOf('#/paths/');
        if (firstPathIndex !== lastPathIndex) {
          handleWarning({
            mitigationType: MitigationTypes.AMBIGUOUS_LINK,
            message:
              `The link '${linkKey}' in operation '${operation.operationString}' ` +
              `contains an ambiguous operationRef '${operationRef}', ` +
              `meaning it has multiple instances of the string '#/paths/'`,
            data,
            logger: translationLogger,
          });

          return null;
        }

        linkLocation = operationRef.substring(0, firstPathIndex);
        linkRelativePathAndMethod = operationRef.substring(firstPathIndex);

        // Cannot find relative path candidate
      } else {
        handleWarning({
          mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
          message:
            `The link '${linkKey}' in operation '${operation.operationString}' ` +
            `does not contain a valid path in operationRef '${operationRef}', ` +
            `meaning it does not contain a string '#/paths/'`,
          data,
          logger: translationLogger,
        });

        return null;
      }
    }

    // Infer operationId from relative path
    if (typeof linkRelativePathAndMethod === 'string') {
      let linkPath;
      let linkMethod: Oas3Tools.HTTP_METHODS;

      /**
       * NOTE: I wish we could extract the linkedOpId by matching the
       * linkedOpObject with an operation in data and extracting the operationId
       * there but that does not seem to be possible especiially because you
       * need to know the operationId just to access the operations so what I
       * have to do is reconstruct the operationId the same way preprocessing
       * does it
       */

      /**
       * linkPath should be the path followed by the method
       *
       * Find the slash that divides the path from the method
       */
      const pivotSlashIndex = linkRelativePathAndMethod.lastIndexOf('/');

      // Check if there are any '/' in the linkPath
      if (pivotSlashIndex !== -1) {
        // Get method

        // Check if there is a method at the end of the linkPath
        if (pivotSlashIndex !== linkRelativePathAndMethod.length - 1) {
          try {
            // Start at +1 because we do not want the starting '/'
            linkMethod = Oas3Tools.methodToHttpMethod(linkRelativePathAndMethod.substring(pivotSlashIndex + 1));
          } catch {
            handleWarning({
              mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
              message: `The operationRef '${operationRef}' contains an ` + `invalid HTTP method '${linkMethod}'`,
              data,
              logger: translationLogger,
            });

            return null;
          }

          // There is no method at the end of the path
        } else {
          handleWarning({
            mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
            message: `The operationRef '${operationRef}' does not contain an` + `HTTP method`,
            data,
            logger: translationLogger,
          });

          return null;
        }

        /**
         * Get path
         *
         * Substring starts at index 8 and ends at pivotSlashIndex to exclude
         * the '/'s at the ends of the path
         *
         * TODO: improve removing '/#/paths'?
         */
        linkPath = linkRelativePathAndMethod.substring(8, pivotSlashIndex);

        /**
         * linkPath is currently a JSON Pointer
         *
         * Revert the escaped '/', represented by '~1', to form intended path
         */
        linkPath = linkPath.replace(/~1/g, '/');

        // Find the right oas
        const oas =
          typeof linkLocation === 'undefined'
            ? operation.oas
            : getOasFromLinkLocation(linkLocation, link, data, logger);

        // If the link was external, make sure that an OAS could be identified
        if (typeof oas !== 'undefined') {
          if (typeof linkMethod === 'string' && typeof linkPath === 'string') {
            let linkedOpId;

            if (linkPath in oas.paths && linkMethod in oas.paths[linkPath]) {
              const linkedOpObject = oas.paths[linkPath][linkMethod];

              if ('operationId' in linkedOpObject) {
                linkedOpId = linkedOpObject.operationId;
              }
            }

            if (typeof linkedOpId !== 'string') {
              linkedOpId = Oas3Tools.generateOperationId(linkMethod, linkPath);
            }

            if (linkedOpId in data.operations) {
              return linkedOpId;
            } else {
              handleWarning({
                mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
                message:
                  `The link '${linkKey}' references an operation with ` +
                  `operationId '${linkedOpId}' but no such operation exists. ` +
                  `Note that the operationId may be autogenerated but ` +
                  `regardless, the link could not be matched to an operation.`,
                data,
                logger: translationLogger,
              });

              return null;
            }

            // Path and method could not be found
          } else {
            handleWarning({
              mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
              message:
                `Cannot identify path and/or method, '${linkPath} and ` +
                `'${linkMethod}' respectively, from operationRef ` +
                `'${operationRef}' in link '${linkKey}'`,
              data,
              logger: translationLogger,
            });

            return null;
          }

          // External link could not be resolved
        } else {
          handleWarning({
            mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
            message: `The link '${link.operationRef}' references an external OAS ` + `but it was not provided`,
            data,
            logger: translationLogger,
          });

          return null;
        }

        // Cannot split relative path into path and method sections
      } else {
        handleWarning({
          mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
          message: `Cannot extract path and/or method from operationRef ` + `'${operationRef}' in link '${linkKey}'`,
          data,
          logger: translationLogger,
        });

        return null;
      }

      // Cannot extract relative path from absolute path
    } else {
      handleWarning({
        mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
        message: `Cannot extract path and/or method from operationRef ` + `'${operationRef}' in link '${linkKey}'`,
        data,
        logger: translationLogger,
      });

      return null;
    }
  }
}

/**
 * Determin if an argument should be created if the argument has already been
 * provided through the options
 */
function skipArg<TSource, TContext, TArgs>(
  parameter: ParameterObject,
  operation: Operation,
  data: PreprocessingData<TSource, TContext, TArgs>,
  includeHttpDetails: boolean
): boolean {
  if (typeof data.options === 'object') {
    switch (parameter.in) {
      case 'header':
        // Check header option
        if (typeof data.options.headers === 'object' && parameter.name in data.options.headers) {
          return true;
        } else if (typeof data.options.headers === 'function') {
          const headers = data.options.headers(operation.method, operation.path, operation.oas.info?.title);

          if (typeof headers === 'object') {
            return true;
          }

          // Check requestOptions option
        } else if (typeof data.options.requestOptions === 'object') {
          if (
            typeof data.options.requestOptions.headers === 'object' &&
            parameter.name in data.options.requestOptions.headers
          ) {
            return true;
          } /* else if (
            typeof data.options.requestOptions.headers === 'function'
          ) {
            const headers = data.options.requestOptions.headers(
              operation.method,
              operation.path,
              operation.oas.info?.title
            )

            if (typeof headers === 'object') {
              return true
            }
          } */
        }

        break;

      case 'query':
        // Check header option
        if (typeof data.options.qs === 'object' && parameter.name in data.options.qs) {
          return true;

          // Check requestOptions option
        } /* else if (
          typeof data.options.requestOptions === 'object' &&
          typeof data.options.requestOptions.qs === 'object' &&
          parameter.name in data.options.requestOptions.qs
        ) {
          return true
        } */

        break;
    }
  }

  return false;
}

/**
 * Creates the arguments for resolving a field
 *
 * Arguments that are provided via options will be ignored
 */
export function getArgs<TSource, TContext, TArgs>({
  requestPayloadDef,
  parameters,
  operation,
  data,
  includeHttpDetails,
  logger,
}: GetArgsParams<TSource, TContext, TArgs>): Args {
  const translationLogger = logger.child('translation');
  let args: any = {};

  // Handle params:
  parameters.forEach(parameter => {
    // We need at least a name
    if (typeof parameter.name !== 'string') {
      handleWarning({
        mitigationType: MitigationTypes.INVALID_OAS,
        message:
          `The operation '${operation.operationString}' contains a ` +
          `parameter '${JSON.stringify(parameter)}' with no 'name' property`,
        data,
        logger: translationLogger,
      });
      return;
    }

    // If this parameter is provided via options, ignore
    if (skipArg(parameter, operation, data, includeHttpDetails)) {
      return;
    }

    /**
     * Determine type of parameter
     *
     * The type of the parameter can either be contained in the "schema" field
     * or the "content" field (but not both)
     */
    let schema: SchemaObject | ReferenceObject;
    if (typeof parameter.schema === 'object') {
      schema = parameter.schema;
    } else if (typeof parameter.content === 'object') {
      const contentTypes = Object.keys(parameter.content);
      const jsonContentType = contentTypes.find(
        contentType => contentType.toString().includes('application/json') || contentType.toString().includes('*/*')
      );
      if (
        jsonContentType &&
        typeof parameter.content[jsonContentType] === 'object' &&
        typeof parameter.content[jsonContentType].schema === 'object'
      ) {
        schema = parameter.content[jsonContentType].schema;
      } else {
        handleWarning({
          mitigationType: MitigationTypes.NON_APPLICATION_JSON_SCHEMA,
          message:
            `The operation '${operation.operationString}' contains a ` +
            `parameter '${JSON.stringify(parameter)}' that has a 'content' ` +
            `property but no schemas in application/json format. The ` +
            `parameter will not be created`,
          data,
          logger: translationLogger,
        });
        return;
      }
    } else {
      // Invalid OAS according to 3.0.2
      handleWarning({
        mitigationType: MitigationTypes.INVALID_OAS,
        message:
          `The operation '${operation.operationString}' contains a ` +
          `parameter '${JSON.stringify(parameter)}' with no 'schema' or ` +
          `'content' property`,
        data,
        logger: translationLogger,
      });
      return;
    }

    /**
     * Resolving the reference is necessary later in the code and by doing it,
     * we can avoid doing it a second time in resolveRev()
     */
    if ('$ref' in schema) {
      schema = Oas3Tools.resolveRef(schema.$ref, operation.oas);
    }

    const paramDef = createDataDef(
      { fromSchema: parameter.name },
      schema as SchemaObject,
      true,
      data,
      operation.oas,
      logger
    );

    const type = getGraphQLType({
      def: paramDef,
      operation,
      data,
      iteration: 0,
      isInputObjectType: true,
      includeHttpDetails,
      logger,
    });

    /**
     * Sanitize the argument name
     *
     * NOTE: when matching these parameters back to requests, we need to again
     * use the real parameter name
     */
    const saneName = Oas3Tools.sanitize(
      parameter.name,
      !data.options.simpleNames ? Oas3Tools.CaseStyle.camelCase : Oas3Tools.CaseStyle.simple
    );

    // Parameters are not required when a default exists:
    let hasDefault = false;
    if (typeof parameter.schema === 'object') {
      let schema = parameter.schema;
      if (typeof schema.$ref === 'string') {
        schema = Oas3Tools.resolveRef(parameter.schema.$ref, operation.oas);
      }
      if (typeof (schema as SchemaObject).default !== 'undefined') {
        hasDefault = true;
      }
    }
    const paramRequired = parameter.required && !hasDefault;

    args[saneName] = {
      type: paramRequired ? new GraphQLNonNull(type) : type,
      description: parameter.description, // Might be undefined
    };
  });

  // Add limit argument
  if (
    data.options.addLimitArgument &&
    typeof operation.responseDefinition === 'object' &&
    operation.responseDefinition.schema.type === 'array' &&
    // Only add limit argument to lists of object types, not to lists of scalar types
    ((operation.responseDefinition.subDefinitions as DataDefinition).schema.type === 'object' ||
      (operation.responseDefinition.subDefinitions as DataDefinition).schema.type === 'array' ||
      ((operation.responseDefinition.subDefinitions as DataDefinition).schema.type === undefined &&
        ((operation.responseDefinition.subDefinitions as DataDefinition).schema.allOf ||
          (operation.responseDefinition.subDefinitions as DataDefinition).schema.anyOf ||
          (operation.responseDefinition.subDefinitions as DataDefinition).schema.oneOf)))
  ) {
    // Make sure slicing arguments will not overwrite preexisting arguments
    if ('limit' in args) {
      handleWarning({
        mitigationType: MitigationTypes.LIMIT_ARGUMENT_NAME_COLLISION,
        message:
          `The 'limit' argument cannot be added ` +
          `because of a preexisting argument in ` +
          `operation ${operation.operationString}`,
        data,
        logger: translationLogger,
      });
    } else {
      args.limit = {
        type: GraphQLInt,
        description:
          `Auto-generated argument that limits the size of ` +
          `returned list of objects/list, selecting the first \`n\` ` +
          `elements of the list`,
      };
    }
  }

  // Handle request payload (if present):
  if (typeof requestPayloadDef === 'object') {
    const reqObjectType = getGraphQLType({
      def: requestPayloadDef,
      data,
      operation,
      isInputObjectType: true, // Request payloads will always be an input object type
      includeHttpDetails,
      logger,
    });

    // Sanitize the argument name
    const saneName = data.options.genericPayloadArgName
      ? 'requestBody'
      : Oas3Tools.uncapitalize(requestPayloadDef.graphQLInputObjectTypeName); // Already sanitized

    const reqRequired =
      typeof operation === 'object' && typeof operation.payloadRequired === 'boolean'
        ? operation.payloadRequired
        : false;

    args[saneName] = {
      type: reqRequired ? new GraphQLNonNull(reqObjectType) : reqObjectType,
      // TODO: addendum to the description explaining this is the request body
      description: requestPayloadDef.schema.description,
    };
  }

  args = sortObject(args);
  return args;
}

/**
 * Used in the context of links, specifically those using an external operationRef
 * If the reference is an absolute reference, determine the type of location
 *
 * For example, name reference, file path, web-hosted OAS link, etc.
 */
function getLinkLocationType(linkLocation: string): string {
  // TODO: currently we only support the title as a link location
  return 'title';
}

/**
 * Used in the context of links, specifically those using an external operationRef
 * Based on the location of the OAS, retrieve said OAS
 */
function getOasFromLinkLocation<TSource, TContext, TArgs>(
  linkLocation: string,
  link: LinkObject,
  data: PreprocessingData<TSource, TContext, TArgs>,
  logger: Logger
): Oas3 | void {
  const translationLogger = logger.child('translation');
  // May be an external reference
  switch (getLinkLocationType(linkLocation)) {
    case 'title':
      // Get the possible
      const possibleOass = data.oass.filter(oas => {
        return oas.info?.title === linkLocation;
      });

      // Check if there are an ambiguous OASs
      if (possibleOass.length === 1) {
        // No ambiguity
        return possibleOass[0];
      } else if (possibleOass.length > 1) {
        // Some ambiguity
        handleWarning({
          mitigationType: MitigationTypes.AMBIGUOUS_LINK,
          message:
            `The operationRef '${link.operationRef}' references an ` +
            `OAS '${linkLocation}' but multiple OASs share the same title`,
          data,
          logger: translationLogger,
        });
      } else {
        // No OAS had the expected title
        handleWarning({
          mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
          message:
            `The operationRef '${link.operationRef}' references an ` +
            `OAS '${linkLocation}' but no such OAS was provided`,
          data,
          logger: translationLogger,
        });
      }
      break;

    // // TODO
    // case 'url':
    //   break

    // // TODO
    // case 'file':
    //   break

    // TODO: should title be default?
    // In cases of names like api.io
    default:
      handleWarning({
        mitigationType: MitigationTypes.UNRESOLVABLE_LINK,
        message:
          `The link location of the operationRef ` +
          `'${link.operationRef}' is currently not supported\n` +
          `Currently only the title of the OAS is supported`,
        data,
        logger: translationLogger,
      });
  }
}
