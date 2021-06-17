import { GraphQLResolveInfo } from 'graphql';
import { stringInterpolator, hashObject } from '@graphql-mesh/utils';

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
    args: options.args,
    argsHash,
    fieldNamesHash,
    info: options.info || null,
  };

  return stringInterpolator.parse(options.keyStr, templateData);
}
