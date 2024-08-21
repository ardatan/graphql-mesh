import { getNamedType, isListType, type GraphQLObjectType, type GraphQLResolveInfo } from 'graphql';
import urljoin from 'url-join';
import { createGraphQLError, getDirectiveExtensions } from '@graphql-tools/utils';
import type { DirectiveArgsMap } from '../directives.js';
import { addIdentifierToUrl } from './addIdentifierToUrl.js';
import { getUrlString } from './getUrlString.js';

export function handleResponseText(
  responseText: string,
  urlString: string,
  info: GraphQLResolveInfo,
) {
  let responseJson: any;
  try {
    responseJson = JSON.parse(responseText);
  } catch (error) {
    return createGraphQLError(`Failed to parse response JSON: ${error.message}`, {
      extensions: {
        request: {
          url: urlString,
        },
        response: {
          body: responseText,
        },
        originalError: error,
      },
    });
  }
  if (responseJson.error) {
    return createGraphQLError(responseJson.error.message || responseJson.error, {
      extensions: {
        request: {
          url: urlString,
        },
        response: {
          body: responseJson,
        },
      },
    });
  }
  const urlStringWithoutSearchParams = urlString.split('?')[0];
  if (isListType(info.returnType)) {
    const actualReturnType = getNamedType(info.returnType) as GraphQLObjectType;
    const entityTypeDirectives = getDirectiveExtensions<DirectiveArgsMap>(actualReturnType);
    if ('Message' in responseJson && !('value' in responseJson)) {
      return createGraphQLError(responseJson.Message, {
        extensions: {
          request: {
            url: urlString,
          },
          response: {
            body: responseJson,
          },
        },
      });
    }
    const returnList: any[] = responseJson.value;
    return returnList.map(element => {
      if (!entityTypeDirectives?.entityInfo?.[0]) {
        return element;
      }
      const urlOfElement = new URL(urlStringWithoutSearchParams);
      addIdentifierToUrl(
        urlOfElement,
        entityTypeDirectives.entityInfo[0].identifierFieldName,
        entityTypeDirectives.entityInfo[0].identifierFieldTypeRef,
        element,
      );
      const identifierUrl = element['@odata.id'] || getUrlString(urlOfElement);
      const fieldMap = actualReturnType.getFields();
      for (const fieldName in element) {
        if (entityTypeDirectives.entityInfo[0].navigationFields.includes(fieldName)) {
          const field = element[fieldName];
          let fieldType = fieldMap[fieldName].type;
          if ('ofType' in fieldType) {
            fieldType = fieldType.ofType;
          }
          const fieldTypeDirectives = getDirectiveExtensions<DirectiveArgsMap>(
            fieldType as GraphQLObjectType,
          );
          const fieldEntityInfo = fieldTypeDirectives?.entityInfo?.[0];
          if (field instanceof Array) {
            for (const fieldElement of field) {
              const urlOfField = new URL(urljoin(identifierUrl, fieldName));
              addIdentifierToUrl(
                urlOfField,
                fieldEntityInfo.identifierFieldName,
                fieldEntityInfo.identifierFieldTypeRef,
                fieldElement,
              );
              fieldElement['@odata.id'] = fieldElement['@odata.id'] || getUrlString(urlOfField);
            }
          } else {
            const urlOfField = new URL(urljoin(identifierUrl, fieldName));
            addIdentifierToUrl(
              urlOfField,
              fieldEntityInfo.identifierFieldName,
              fieldEntityInfo.identifierFieldTypeRef,
              field,
            );
            field['@odata.id'] = field['@odata.id'] || getUrlString(urlOfField);
          }
        }
      }
      return {
        '@odata.id': identifierUrl,
        ...element,
      };
    });
  } else {
    const actualReturnType = info.returnType as GraphQLObjectType;
    const entityTypeDirectives = getDirectiveExtensions<DirectiveArgsMap>(actualReturnType);
    if (!entityTypeDirectives?.entityInfo?.[0]) {
      return responseJson;
    }
    const identifierUrl = responseJson['@odata.id'] || urlStringWithoutSearchParams;
    const fieldMap = actualReturnType.getFields();
    for (const fieldName in responseJson) {
      if (entityTypeDirectives?.entityInfo?.[0]?.navigationFields.includes(fieldName)) {
        const field = responseJson[fieldName];
        let fieldType = fieldMap[fieldName].type;
        if ('ofType' in fieldType) {
          fieldType = fieldType.ofType;
        }
        const fieldTypeDirectives = getDirectiveExtensions<DirectiveArgsMap>(
          fieldType as GraphQLObjectType,
        );
        const fieldEntityInfo = fieldTypeDirectives?.entityInfo?.[0];
        if (field instanceof Array) {
          for (const fieldElement of field) {
            const urlOfField = new URL(urljoin(identifierUrl, fieldName));
            addIdentifierToUrl(
              urlOfField,
              fieldEntityInfo.identifierFieldName,
              fieldEntityInfo.identifierFieldTypeRef,
              fieldElement,
            );
            fieldElement['@odata.id'] = fieldElement['@odata.id'] || getUrlString(urlOfField);
          }
        } else {
          const urlOfField = new URL(urljoin(identifierUrl, fieldName));
          addIdentifierToUrl(
            urlOfField,
            fieldEntityInfo.identifierFieldName,
            fieldEntityInfo.identifierFieldTypeRef,
            field,
          );
          field['@odata.id'] = field['@odata.id'] || getUrlString(urlOfField);
        }
      }
    }
    return {
      '@odata.id': responseJson['@odata.id'] || urlStringWithoutSearchParams,
      ...responseJson,
    };
  }
}
