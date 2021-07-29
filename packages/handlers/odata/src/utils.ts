export function getUrlString(url: URL) {
  return decodeURIComponent(url.toString()).split('+').join(' ');
}

export function addIdentifierToUrl(url: URL, identifierFieldName: string, identifierFieldTypeRef: string, args: any) {
  url.href += `/${args[identifierFieldName]}/`;
}
