// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * Functions to create viewers that allow users to pass credentials to resolve
 * functions used by OpenAPI-to-GraphQL.
 */

// Type imports:
import {
  GraphQLObjectType as GQObjectType,
  GraphQLString,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLFieldConfigMap,
} from 'graphql';
import { Args, ResolveFunction } from './types/graphql';
import { PreprocessingData, ProcessedSecurityScheme } from './types/preprocessing_data';

// Imports:
import { getGraphQLType } from './schema_builder';
import * as Oas3Tools from './oas_3_tools';
import debug from 'debug';
import { handleWarning, sortObject } from './utils';
import { createDataDef } from './preprocessor';

// Type definitions & exports:
type Viewer = {
  type: GQObjectType;
  resolve: ResolveFunction;
  args: Args;
  description: string;
};

const translationLog = debug('translation');

/**
 * Load the field object in the appropriate root object
 *
 * i.e. inside either rootQueryFields/rootMutationFields or inside
 * rootQueryFields/rootMutationFields for further processing
 */
export function createAndLoadViewer(
  queryFields: object,
  data: PreprocessingData,
  isMutation = false
): { [key: string]: Viewer } {
  const results = {};
  /**
   * To ensure that viewers have unique names, we add a numerical postfix.
   *
   * This object keeps track of what the postfix should be.
   *
   * The key is the security scheme type and the value is
   * the current highest postfix used for viewers of that security scheme type.
   */
  const viewerNamePostfix: { [key: string]: number } = {};

  /**
   * Used to collect all fields in the given querFields object, no matter which
   * protocol. Used to populate anyAuthViewer.
   */
  const anyAuthFields = {};

  for (const protocolName in queryFields) {
    Object.assign(anyAuthFields, queryFields[protocolName]);

    /**
     * Check if the name has already been used (i.e. in the list)
     * if so, create a new name and add it to the list
     */
    const securityType = data.security[protocolName].def.type;
    let viewerType: string;

    /**
     * HTTP is not an authentication protocol
     * HTTP covers a number of different authentication type
     * change the typeName to match the exact authentication type (e.g. basic
     * authentication)
     */
    if (securityType === 'http') {
      const scheme = data.security[protocolName].def.scheme;
      switch (scheme) {
        case 'basic':
          viewerType = 'basicAuth';
          break;

        default:
          handleWarning({
            typeKey: 'UNSUPPORTED_HTTP_SECURITY_SCHEME',
            message: `Currently unsupported HTTP authentication protocol ` + `type 'http' and scheme '${scheme}'`,
            data,
            log: translationLog,
          });

          continue;
      }
    } else {
      viewerType = securityType;
    }

    // Create name for the viewer
    let viewerName = !isMutation
      ? Oas3Tools.sanitize(`viewer ${viewerType}`, Oas3Tools.CaseStyle.camelCase)
      : Oas3Tools.sanitize(`mutation viewer ${viewerType}`, Oas3Tools.CaseStyle.camelCase);

    // Ensure unique viewer name
    // If name already exists, append a number at the end of the name
    if (!(viewerType in viewerNamePostfix)) {
      viewerNamePostfix[viewerType] = 1;
    } else {
      viewerName += ++viewerNamePostfix[viewerType];
    }

    // Add the viewer object type to the specified root query object type
    results[viewerName] = getViewerOT(viewerName, protocolName, securityType, queryFields[protocolName], data);
  }

  // Create name for the AnyAuth viewer
  const anyAuthObjectName = !isMutation ? 'viewerAnyAuth' : 'mutationViewerAnyAuth';

  // Add the AnyAuth object type to the specified root query object type
  results[anyAuthObjectName] = getViewerAnyAuthOT(anyAuthObjectName, anyAuthFields, data);

  return results;
}

/**
 * Gets the viewer Object, resolve function, and arguments
 */
const getViewerOT = (
  name: string,
  protocolName: string,
  securityType: string,
  queryFields: GraphQLFieldConfigMap<any, any>,
  data: PreprocessingData
): Viewer => {
  const scheme: ProcessedSecurityScheme = data.security[protocolName];

  // Resolve function:
  const resolve = (_root: any, args: any, _ctx: any) => {
    const security = {};
    const saneProtocolName = Oas3Tools.sanitize(protocolName, Oas3Tools.CaseStyle.camelCase);
    security[Oas3Tools.storeSaneName(saneProtocolName, protocolName, data.saneMap)] = args;

    /**
     * Viewers are always root, so we can instantiate _openAPIToGraphQL here without
     * previously checking for its existence
     */
    return {
      _openAPIToGraphQL: {
        security,
      },
    };
  };

  // Arguments:
  /**
   * Do not sort because they are already "sorted" in preprocessing.
   * Otherwise, for basic auth, "password" will appear before "username"
   */
  const args = {};
  if (typeof scheme === 'object') {
    for (const parameterName in scheme.parameters) {
      args[parameterName] = { type: new GraphQLNonNull(GraphQLString) };
    }
  }

  let typeDescription = `A viewer for security scheme '${protocolName}'`;
  /**
   * HTTP authentication uses different schemes. It is not sufficient to name
   * only the security type
   */
  let description =
    securityType === 'http'
      ? `A viewer that wraps all operations authenticated via security scheme ` +
        `'${protocolName}', which is of type 'http' '${scheme.def.scheme}'`
      : `A viewer that wraps all operations authenticated via security scheme ` +
        `'${protocolName}', which is of type '${securityType}'`;

  if (data.oass.length !== 1) {
    typeDescription += ` in OAS '${scheme.oas.info.title}'`;
    description = `, in OAS '${scheme.oas.info.title}`;
  }

  return {
    type: new GraphQLObjectType({
      name: Oas3Tools.capitalize(name), // Should already be sanitized and in camelCase
      description: typeDescription,
      fields: () => queryFields,
    }),
    resolve,
    args,
    description,
  };
};

/**
 * Create an object containing an AnyAuth viewer, its resolve function,
 * and its args.
 */
const getViewerAnyAuthOT = (
  name: string,
  queryFields: GraphQLFieldConfigMap<any, any>,
  data: PreprocessingData
): Viewer => {
  let args = {};
  for (const protocolName in data.security) {
    // Create input object types for the viewer arguments
    const def = createDataDef(
      { fromRef: protocolName },
      data.security[protocolName].schema,
      true,
      data,
      data.security[protocolName].oas
    );

    const type = getGraphQLType({
      def,
      data,
      isInputObjectType: true,
    });

    const saneProtocolName = Oas3Tools.sanitize(protocolName, Oas3Tools.CaseStyle.camelCase);
    args[Oas3Tools.storeSaneName(saneProtocolName, protocolName, data.saneMap)] = { type };
  }
  args = sortObject(args);

  // Pass object containing security information to fields
  const resolve = (_root: any, args: any, _ctx: any) => {
    return {
      _openAPIToGraphQL: {
        security: args,
      },
    };
  };

  return {
    type: new GraphQLObjectType({
      name: Oas3Tools.capitalize(name), // Should already be GraphQL safe
      description: 'Warning: Not every request will work with this viewer type',
      fields: () => queryFields,
    }),
    resolve,
    args,
    description: `A viewer that wraps operations for all available ` + `authentication mechanisms`,
  };
};
