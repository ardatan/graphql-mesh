import {
  getNamedType,
  GraphQLError,
  isListType,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
} from 'graphql';
import urljoin from 'url-join';
import { addIdentifierToUrl } from './addIdentifierToUrl.js';
import { isODataNavigationField } from './entityFieldKind.js';
import { getEntityKeyFieldName } from './getEntityKeyFieldName.js';
import { getUrlString } from './getUrlString.js';

function attachNavODataIds(
  element: Record<string, any>,
  actualReturnType: GraphQLObjectType,
  identifierUrl: string,
) {
  const fieldMap = actualReturnType.getFields();
  for (const fieldName in element) {
    const graphqlField = fieldMap[fieldName];
    if (!graphqlField || !isODataNavigationField(graphqlField)) {
      continue;
    }
    const field = element[fieldName];
    let fieldType = graphqlField.type;
    if ('ofType' in fieldType) {
      fieldType = fieldType.ofType;
    }
    const identifierFieldName = getEntityKeyFieldName(fieldType as GraphQLObjectType);
    if (!identifierFieldName) {
      continue;
    }
    if (field instanceof Array) {
      for (const fieldElement of field) {
        const urlOfField = new URL(urljoin(identifierUrl, fieldName));
        addIdentifierToUrl(urlOfField, identifierFieldName, fieldElement);
        fieldElement['@odata.id'] = fieldElement['@odata.id'] || getUrlString(urlOfField);
      }
    } else if (field != null) {
      const urlOfField = new URL(urljoin(identifierUrl, fieldName));
      addIdentifierToUrl(urlOfField, identifierFieldName, field);
      field['@odata.id'] = field['@odata.id'] || getUrlString(urlOfField);
    }
  }
}

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
    const identifierFieldName = getEntityKeyFieldName(actualReturnType);
    return returnList.map(element => {
      if (!identifierFieldName) {
        return element;
      }
      const urlOfElement = new URL(urlStringWithoutSearchParams);
      addIdentifierToUrl(urlOfElement, identifierFieldName, element);
      const identifierUrl = element['@odata.id'] || getUrlString(urlOfElement);
      attachNavODataIds(element, actualReturnType, identifierUrl);
      return {
        '@odata.id': identifierUrl,
        ...element,
      };
    });
  } else {
    const actualReturnType = info.returnType as GraphQLObjectType;
    const identifierFieldName = getEntityKeyFieldName(actualReturnType);
    if (!identifierFieldName) {
      return responseJson;
    }
    const identifierUrl = responseJson['@odata.id'] || urlStringWithoutSearchParams;
    attachNavODataIds(responseJson, actualReturnType, identifierUrl);
    return {
      '@odata.id': responseJson['@odata.id'] || urlStringWithoutSearchParams,
      ...responseJson,
    };
  }
}
