// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { PreprocessingData } from './types/preprocessing_data';
import { Warning } from './types/options';

export const mitigations = {
  /**
   * Problems with the OAS
   *
   * Should be caught by the module oas-validator
   */
  INVALID_OAS: `Ignore issue and continue.`,
  UNNAMED_PARAMETER: `Ignore parameter.`,

  // General problems
  AMBIGUOUS_UNION_MEMBERS: `Ignore issue and continue.`,
  CANNOT_GET_FIELD_TYPE: `Ignore field and continue.`,
  COMBINE_SCHEMAS: `Ignore combine schema keyword and continue.`,
  DUPLICATE_FIELD_NAME: `Ignore field and maintain preexisting field.`,
  DUPLICATE_LINK_KEY: `Ignore link and maintain preexisting link.`,
  MISSING_RESPONSE_SCHEMA: `Ignore operation.`,
  MISSING_SCHEMA: `Use arbitrary JSON type.`,
  MULTIPLE_RESPONSES: `Select first response object with successful status code (200-299).`,
  NON_APPLICATION_JSON_SCHEMA: `Ignore schema`,
  OBJECT_MISSING_PROPERTIES: `The (sub-)object will be stored in an arbitray JSON type.`,
  UNKNOWN_TARGET_TYPE: `The response will be stored in an arbitrary JSON type.`,
  UNRESOLVABLE_SCHEMA: `Ignore and continue. May lead to unexpected behavior.`,
  UNSUPPORTED_HTTP_SECURITY_SCHEME: `Ignore security scheme.`,
  UNSUPPORTED_JSON_SCHEMA_KEYWORD: `Ignore keyword and continue.`,

  // Links
  AMBIGUOUS_LINK: `Use first occurance of '#/'.`,
  LINK_NAME_COLLISION: `Ignore link and maintain preexisting field.`,
  UNRESOLVABLE_LINK: `Ignore link.`,

  // Multiple OAS
  DUPLICATE_OPERATIONID: `Ignore operation and maintain preexisting operation.`,
  DUPLICATE_SECURITY_SCHEME: `Ignore security scheme and maintain preexisting scheme.`,
  MULTIPLE_OAS_SAME_TITLE: `Ignore issue and continue.`,

  // Options
  CUSTOM_RESOLVER_UNKNOWN_OAS: `Ignore this set of custom resolvers.`,
  CUSTOM_RESOLVER_UNKNOWN_PATH_METHOD: `Ignore this set of custom resolvers.`,
  LIMIT_ARGUMENT_NAME_COLLISION: `Do not override existing 'limit' argument.`,

  // Miscellaneous
  OAUTH_SECURITY_SCHEME: `Ignore security scheme`,
};

/**
 * Utilities that are specific to OpenAPI-to-GraphQL
 */
export function handleWarning({
  typeKey,
  message,
  mitigationAddendum,
  path,
  data,
  log,
}: {
  typeKey: string;
  message: string;
  mitigationAddendum?: string;
  path?: string[];
  data: PreprocessingData;
  log?: Function;
}) {
  const mitigation = mitigations[typeKey];

  const warning: Warning = {
    type: typeKey,
    message,
    mitigation: mitigationAddendum ? `${mitigation} ${mitigationAddendum}` : mitigation,
  };

  if (typeof path !== 'undefined') {
    warning.path = path;
  }

  if (data.options.strict) {
    throw new Error(`${warning.type} - ${warning.message}`);
  } else {
    const output = `Warning: ${warning.message} - ${warning.mitigation}`;
    if (typeof log === 'function') {
      log(output);
    } else {
      console.warn(output);
    }
    data.options.report.warnings.push(warning);
  }
}

// Code provided by codename- from StackOverflow
// Link: https://stackoverflow.com/a/29622653
export function sortObject(o: any) {
  return (
    Object.keys(o)
      .sort()
      // eslint-disable-next-line no-sequences
      .reduce((r, k) => ((r[k] = o[k]), r), {})
  );
}

/**
 * Finds the common property names between two objects
 */
export function getCommonPropertyNames(object1: any, object2: any): string[] {
  return Object.keys(object1).filter(propertyName => {
    return propertyName in object2;
  }) as string[];
}
