import { dset } from 'dset';
import type { GraphQLField, GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';
import type { ResolverData } from '@graphql-mesh/string-interpolation';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { getDirective } from '@graphql-tools/utils';

export function processLinkFieldAnnotations(
  field: GraphQLField<any, any>,
  defaultRootTypeName: string,
  defaultFieldName: string,
) {
  field.resolve = function linkDirectiveHandler(root, args, context, info) {
    const linkResolverMap = findLinkResolverMap({
      schema: info.schema,
      defaultRootTypeName,
      defaultFieldName,
      parentFieldName: root.$field,
      operationType: info.operation.operation,
    });
    const linkResolverOpts = linkResolverMap[field.name];
    return linkResolver(linkResolverOpts, { root, args, context, info, env: process.env });
  };
}

function findLinkResolverMap({
  schema,
  operationType,
  defaultRootTypeName,
  defaultFieldName,
}: {
  schema: GraphQLSchema;
  defaultRootTypeName: string;
  defaultFieldName: string;
  parentFieldName: string;
  operationType: OperationTypeNode;
}) {
  const parentType = schema.getRootType(operationType);
  const parentField = parentType.getFields()[operationType];
  if (parentField) {
    const linkResolverMap = getLinkResolverMap(schema, parentField);
    if (linkResolverMap) {
      return linkResolverMap;
    }
  }
  const defaultRootType = schema.getType(defaultRootTypeName) as GraphQLObjectType;
  if (defaultRootType) {
    const defaultField = defaultRootType.getFields()[defaultFieldName];
    if (defaultField) {
      const linkResolverMap = getLinkResolverMap(schema, defaultField);
      if (linkResolverMap) {
        return linkResolverMap;
      }
    }
  }
}

function getLinkResolverMap(schema: GraphQLSchema, field: GraphQLField<any, any>) {
  const parentFieldLinkResolverDirectives = getDirective(schema, field, 'linkResolver');
  if (parentFieldLinkResolverDirectives?.length) {
    const linkResolverMap = parentFieldLinkResolverDirectives[0].linkResolverMap;
    if (linkResolverMap) {
      if (typeof linkResolverMap === 'string') {
        return JSON.parse(linkResolverMap);
      }
      return linkResolverMap;
    }
  }
}

interface LinkResolverOpts {
  linkObjArgs: any;
  targetTypeName: string;
  targetFieldName: string;
}

function linkResolver(
  { linkObjArgs, targetTypeName, targetFieldName }: LinkResolverOpts,
  { root, args, context, info, env }: ResolverData,
) {
  for (const argKey in linkObjArgs) {
    const argInterpolation = linkObjArgs[argKey];
    const actualValue =
      typeof argInterpolation === 'string'
        ? stringInterpolator.parse(argInterpolation, {
            root,
            args,
            context,
            info,
            env,
          })
        : argInterpolation;
    dset(args, argKey, actualValue);
  }
  const type = info.schema.getType(targetTypeName) as GraphQLObjectType;
  const field = type.getFields()[targetFieldName];
  return field.resolve(root, args, context, info);
}
