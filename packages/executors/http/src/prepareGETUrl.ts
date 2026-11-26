import { type SerializedExecutionRequest } from '@graphql-tools/executor-common';

export function prepareGETUrl({
  baseUrl = '',
  body,
}: {
  baseUrl: string;
  body: SerializedExecutionRequest;
}) {
  const dummyHostname = 'https://dummyhostname.com';
  // Only treat explicit http(s) schemes as absolute; relative paths like
  // "http-graphql" must stay on the relative-path branch.
  const hasHttpScheme = /^https?:\/\//i.test(baseUrl);
  const usedDummyOrigin = !hasHttpScheme;
  const validUrl = hasHttpScheme
    ? baseUrl
    : baseUrl?.startsWith('/')
      ? `${dummyHostname}${baseUrl}`
      : `${dummyHostname}/${baseUrl}`;
  const urlObj = new URL(validUrl);
  // Keep executor-owned GraphQL params in sync with the serialized body.
  if (body.query) {
    urlObj.searchParams.set('query', body.query);
  } else {
    urlObj.searchParams.delete('query');
  }
  if (body.variables && Object.keys(body.variables).length > 0) {
    urlObj.searchParams.set('variables', JSON.stringify(body.variables));
  }
  if (body.operationName) {
    urlObj.searchParams.set('operationName', body.operationName);
  }
  if (body.extensions) {
    urlObj.searchParams.set('extensions', JSON.stringify(body.extensions));
  }
  const href = urlObj.toString();
  // Strip the dummy origin only when this helper added it.
  const finalUrl = usedDummyOrigin ? href.replace(dummyHostname, '') : href;
  return finalUrl;
}
