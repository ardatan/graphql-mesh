export function getFieldNameFromPath(path: string, method: string) {
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

  return method + fieldName;
}
