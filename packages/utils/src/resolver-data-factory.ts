import { GraphQLFieldConfigArgumentMap, GraphQLNonNull, GraphQLID } from 'graphql';
import { stringInterpolator } from './string-interpolator';
import { Headers } from 'fetchache';
import { ResolverData } from '@graphql-mesh/types';

export type ResolverDataBasedFactory<T> = (data: ResolverData) => T;

export function parseInterpolationStrings(interpolationStrings: string[]) {
  const interpolationKeys = interpolationStrings.reduce(
    (keys, str) => [...keys, ...(str ? stringInterpolator.parseRules(str).map((match: any) => match.key) : [])],
    [] as string[]
  );

  const args: GraphQLFieldConfigArgumentMap = {};
  const contextVariables: string[] = [];

  for (const interpolationKey of interpolationKeys) {
    const interpolationKeyParts = interpolationKey.split('.');
    const varName = interpolationKeyParts[interpolationKeyParts.length - 1];
    if (interpolationKeyParts[0] === 'args') {
      args[varName] = {
        type: new GraphQLNonNull(GraphQLID),
      };
    } else if (interpolationKeyParts[0] === 'context') {
      contextVariables.push(varName);
    }
  }

  return {
    args,
    contextVariables,
  };
}

export function getInterpolatedStringFactory(nonInterpolatedString: string): ResolverDataBasedFactory<string> {
  return resolverData => stringInterpolator.parse(nonInterpolatedString, resolverData);
}

export function getInterpolatedHeadersFactory(
  nonInterpolatedHeaders: Record<string, string> = {}
): ResolverDataBasedFactory<Headers> {
  return resolverData => {
    const headers = new Headers();
    for (const headerName in nonInterpolatedHeaders) {
      const headerValue = nonInterpolatedHeaders[headerName];
      if (headerValue) {
        headers.set(headerName, stringInterpolator.parse(headerValue, resolverData));
      }
    }
    return headers;
  };
}

export function getHeadersObject(headers: Headers): Record<string, string> {
  const headersObj: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  return headersObj;
}
