import { isListType, GraphQLObjectType, GraphQLResolveInfo } from "graphql";
import { EntityTypeExtensions } from "./schema-util";
import { getUrlString, addIdentifierToUrl } from "./util";
import urljoin from 'url-join';

export function handleResponseText(responseText: string, urlString: string, info: GraphQLResolveInfo) {
  let responseJson: any;
  try {
    responseJson = JSON.parse(responseText);
  } catch (error) {
    const actualError = new Error(responseText);
    Object.assign(actualError, {
      extensions: {
        url: urlString,
      },
    });
    throw actualError;
  }
  if (responseJson.error) {
    const actualError = new Error(responseJson.error.message || responseJson.error) as any;
    actualError.extensions = responseJson.error;
    throw actualError;
  }
  const urlStringWithoutSearchParams = urlString.split('?')[0];
  if (isListType(info.returnType)) {
    const actualReturnType: GraphQLObjectType = info.returnType.ofType;
    const entityTypeExtensions = actualReturnType.extensions as EntityTypeExtensions;
    if ('Message' in responseJson && !('value' in responseJson)) {
      const error = new Error(responseJson.Message);
      Object.assign(error, { extensions: responseJson });
      throw error;
    }
    const returnList: any[] = responseJson.value;
    return returnList.map(element => {
      const urlOfElement = new URL(urlStringWithoutSearchParams);
      addIdentifierToUrl(
        urlOfElement,
        entityTypeExtensions.entityInfo.identifierFieldName,
        entityTypeExtensions.entityInfo.identifierFieldTypeRef,
        element
      );
      const identifierUrl = element['@odata.id'] || getUrlString(urlOfElement);
      return buildResponseObject(element, actualReturnType, identifierUrl);
    });
  } else {
    const actualReturnType = info.returnType as GraphQLObjectType;
    const identifierUrl = responseJson['@odata.id'] || urlStringWithoutSearchParams;

    return buildResponseObject(responseJson, actualReturnType, identifierUrl);
  }
}

function buildResponseObject(originalObject: any, actualReturnType: GraphQLObjectType, identifierUrl: any) {
  const entityTypeExtensions = actualReturnType.extensions as EntityTypeExtensions;
  if (!entityTypeExtensions?.entityInfo) {
    return originalObject;
  }

  const fieldMap = actualReturnType.getFields();
  for (const fieldName in originalObject) {
    if (entityTypeExtensions?.entityInfo.navigationFields.includes(fieldName)) {
      const field = originalObject[fieldName];
      let fieldType = fieldMap[fieldName].type;
      if ('ofType' in fieldType) {
        fieldType = fieldType.ofType;
      }
      const { entityInfo: fieldEntityInfo } = (fieldType as any).extensions as EntityTypeExtensions;
      if (field instanceof Array) {
        for (const fieldElement of field) {
          const urlOfField = new URL(urljoin(identifierUrl, fieldName));
          addIdentifierToUrl(
            urlOfField,
            fieldEntityInfo.identifierFieldName,
            fieldEntityInfo.identifierFieldTypeRef,
            fieldElement
          );
          fieldElement['@odata.id'] = field['@odata.id'] || getUrlString(urlOfField);
        }
      } else {
        const urlOfField = new URL(urljoin(identifierUrl, fieldName));
        addIdentifierToUrl(
          urlOfField,
          fieldEntityInfo.identifierFieldName,
          fieldEntityInfo.identifierFieldTypeRef,
          field
        );
        field['@odata.id'] = field['@odata.id'] || getUrlString(urlOfField);
      }
    }
  }

  return {
    '@odata.id': identifierUrl,
    ...originalObject,
  };
}
