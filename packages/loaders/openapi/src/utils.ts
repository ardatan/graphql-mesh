export function getFieldNameFromPath(path: string, method: string, responseTypeSchemaRef: string) {
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
  if (!fieldName && responseTypeSchemaRef) {
    const refArr = responseTypeSchemaRef.split('/');
    fieldName = refArr[refArr.length - 1];
  }

  return method + fieldName;
}
