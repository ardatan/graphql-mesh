export function addIdentifierToUrl(
  url: URL,
  identifierFieldName: string,
  identifierFieldTypeRef: string,
  args: any,
) {
  url.href += `/${args[identifierFieldName]}/`;
}
