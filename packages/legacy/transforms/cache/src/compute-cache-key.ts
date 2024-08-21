import type { GraphQLResolveInfo } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import { hashObject, stringInterpolator } from '@graphql-mesh/string-interpolation';

export function computeCacheKey(options: {
  keyStr: string | undefined;
  args: Record<string, any>;
  info: GraphQLResolveInfo;
}): string {
  const argsHash = options.args ? hashObject(options.args) : '';
  const fieldNamesHash = hashObject(options.info.fieldNodes);

  if (!options.keyStr) {
    return `${options.info.parentType.name}-${options.info.fieldName}-${argsHash}-${fieldNamesHash}`;
  }

  const templateData = {
    typeName: options.info.parentType.name,
    fieldName: options.info.fieldName,
    args: options.args,
    argsHash,
    fieldNamesHash,
    info: options.info || null,
    env: process.env,
  };

  return stringInterpolator.parse(options.keyStr, templateData);
}
