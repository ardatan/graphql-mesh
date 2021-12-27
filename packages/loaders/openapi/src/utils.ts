import { JSONSchemaObject } from 'json-machete';

export function getFieldNameFromPath(path: string, method: string, responseTypeSchema: JSONSchemaObject) {
  const parts = path.split('/').filter(Boolean);
  let fieldName = '';

  for (const part of parts) {
    const [actualPart, allQueryPart] = part.split('?');
    fieldName += '_' + actualPart;
    if (allQueryPart) {
      const queryParts = allQueryPart.split('&');
      for (const queryPart of queryParts) {
        const [queryName] = queryPart.split('=');
        fieldName += '_' + 'by' + '_' + queryName;
      }
    }
    if (fieldName.includes('{')) {
      fieldName = fieldName.split('{').join('by_').split('}').join('');
    }
  }

  // If path doesn't give any field name, we can use the return type with HTTP Method name
  if (!fieldName && responseTypeSchema.$ref) {
    const refPathElems = responseTypeSchema.$ref.split('/');
    fieldName = refPathElems[refPathElems.length - 1];
  }

  return method + fieldName;
}
