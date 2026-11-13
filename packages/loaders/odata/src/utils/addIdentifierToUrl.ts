export function addIdentifierToUrl(url: URL, identifierFieldName: string, args: any) {
  url.href += `/${args[identifierFieldName]}/`;
}
