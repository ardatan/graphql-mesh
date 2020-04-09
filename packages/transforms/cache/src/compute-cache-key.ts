import { GraphQLResolveInfo } from 'graphql';
import objectHash from 'object-hash';
import { stringInterpolator } from '@graphql-mesh/utils';

export function computeCacheKey(options: {
  keyStr: string | undefined;
  args: Record<string, any>;
  info: GraphQLResolveInfo;
}): string {
  const argsHash = options.args ? objectHash(options.args, { ignoreUnknown: true }) : '';

  if (!options.keyStr) {
    return `${options.info.parentType.name}-${options.info.fieldName}-${argsHash}`;
  }

  const templateData = {
    args: options.args,
    argsHash,
    info: options.info || null,
  };

  return stringInterpolator.parse(options.keyStr, templateData);
}
