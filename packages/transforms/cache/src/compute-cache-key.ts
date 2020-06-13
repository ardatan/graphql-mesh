import { GraphQLResolveInfo } from 'graphql';
import objectHash from 'object-hash';
import { stringInterpolator } from '@graphql-mesh/utils';
import graphqlFields from 'graphql-fields';

export function computeCacheKey(options: {
  keyStr: string | undefined;
  args: Record<string, any>;
  info: GraphQLResolveInfo;
}): string {
  const argsHash = options.args ? objectHash(options.args, { ignoreUnknown: true }) : '';
  const fieldsObj = graphqlFields(options.info);
  const fieldNamesHash = objectHash(fieldsObj, { ignoreUnknown: true });

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
