import {
  getNamedType,
  GraphQLError,
  isListType,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
} from 'graphql';
import urljoin from 'url-join';
import { addIdentifierToUrl } from './addIdentifierToUrl.js';
import { getEntityInfo } from './getEntityInfo.js';
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
    return new GraphQLError(`Failed to parse response JSON: ${error.message}`, {
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
    return new GraphQLError(responseJson.error.message || responseJson.error, {
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
    const entityInfo = getEntityInfo(actualReturnType);
    if ('Message' in responseJson && !('value' in responseJson)) {
      return new GraphQLError(responseJson.Message, {
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
      if (!entityInfo) {
        return element;
      }
      const urlOfElement = new URL(urlStringWithoutSearchParams);
      addIdentifierToUrl(
        urlOfElement,
        entityInfo.identifierFieldName,
        entityInfo.identifierFieldTypeRef,
        element,
      );
      const identifierUrl = element['@odata.id'] || getUrlString(urlOfElement);
      const fieldMap = actualReturnType.getFields();
      for (const fieldName in element) {
        if (entityInfo.navigationFields.includes(fieldName)) {
          const field = element[fieldName];
          const fieldEntityInfo = getEntityInfo(
            getNamedType(fieldMap[fieldName].type) as GraphQLObjectType,
          );
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
    const entityInfo = getEntityInfo(actualReturnType);
    if (!entityInfo) {
      return responseJson;
    }
    const identifierUrl = responseJson['@odata.id'] || urlStringWithoutSearchParams;
    const fieldMap = actualReturnType.getFields();
    for (const fieldName in responseJson) {
      if (entityInfo.navigationFields.includes(fieldName)) {
        const field = responseJson[fieldName];
        const fieldEntityInfo = getEntityInfo(
          getNamedType(fieldMap[fieldName].type) as GraphQLObjectType,
        );
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
