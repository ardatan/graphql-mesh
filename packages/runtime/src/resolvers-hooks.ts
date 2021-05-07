import { MeshPubSub } from '@graphql-mesh/types';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLField,
  Kind,
  DocumentNode,
  print,
  parse,
  OperationDefinitionNode,
  GraphQLResolveInfo,
} from 'graphql';
import { composeResolvers } from '@graphql-tools/resolvers-composition';
import { IResolvers, buildOperationNodeForField, SelectedFields } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { MESH_CONTEXT_SYMBOL, MESH_API_CONTEXT_SYMBOL } from './constants';
import { MeshContext, APIContext } from './types';
import { delegateToSchema } from '@graphql-tools/delegate';
import { extractResolvers } from '@graphql-mesh/utils';

function isMeshContext(context: any): context is MeshContext {
  return !!context && typeof context === 'object' && MESH_CONTEXT_SYMBOL in context;
}

function isAPIContext(apiContext: any): apiContext is APIContext {
  return !!apiContext && typeof apiContext === 'object' && MESH_API_CONTEXT_SYMBOL in apiContext;
}

type Operation = 'query' | 'mutation' | 'subscription';

function createProxyInfo({
  schema,
  parentType,
  field,
  depthLimit = 2,
  root,
  args,
  selectedFields,
  selectionSet,
  operationKind,
  info,
}: {
  schema: GraphQLSchema;
  parentType: GraphQLObjectType;
  field: GraphQLField<any, any>;
  root: any;
  args: Record<string, any>;
  depthLimit?: number;
  selectedFields?: SelectedFields;
  selectionSet?: string | DocumentNode;
  info: GraphQLResolveInfo;
  operationKind: Operation;
}): any {
  const actualReturnType = 'ofType' in info.returnType ? info.returnType.ofType : info.returnType;
  const returnType = 'ofType' in field.type ? field.type.ofType : field.type;
  if (
    !selectedFields &&
    !selectionSet &&
    'name' in actualReturnType &&
    'name' in returnType &&
    actualReturnType.name === returnType.name
  ) {
    return {
      ...info,
      returnType,
    };
  }

  selectionSet = selectionSet && (typeof selectionSet === 'string' ? parse(selectionSet) : parse(print(selectionSet)));

  const operation =
    (selectionSet?.definitions[0] as OperationDefinitionNode) ||
    buildOperationNodeForField({
      schema,
      kind: operationKind,
      field: field.name,
      depthLimit,
      argNames: Object.keys(args),
      selectedFields,
    });

  return {
    fieldName: field.name,
    fieldNodes: operation.selectionSet.selections.filter(s => s.kind === Kind.FIELD),
    returnType: field.type,
    parentType,
    schema,
    fragments: {},
    rootValue: root,
    operation,
    variableValues: args,
    path: {
      key: field.name,
    },
  };
}

export function applyResolversHooksToResolvers(
  unifiedSchema: GraphQLSchema,
  resolvers: IResolvers,
  pubsub: MeshPubSub
): IResolvers {
  // TODO: We should find another way to map schema with rawSources
  const nameSchemaMap = new Map<string, GraphQLSchema>();
  if (unifiedSchema.extensions?.sourceMap) {
    for (const [rawSource, schema] of unifiedSchema.extensions.sourceMap.entries()) {
      nameSchemaMap.set(rawSource.name, schema);
    }
  }
  return composeResolvers(resolvers, {
    '*.*': originalResolver => async (root, args, context = {}, info) => {
      const resolverData = {
        root,
        args,
        context,
        info,
      };
      pubsub.publish('resolverCalled', { resolverData });

      try {
        const proxyContext = new Proxy(context, {
          get(context, apiName: string) {
            if (isMeshContext(context)) {
              const apiContext = context[apiName];
              if (isAPIContext(apiContext)) {
                return {
                  ...apiContext,
                  api: getSdk(apiContext, nameSchemaMap, info, root, context, 'all'), // To keep to not have breaking changes
                  apiQuery: getSdk(apiContext, nameSchemaMap, info, root, context, 'query'),
                  apiMutation: getSdk(apiContext, nameSchemaMap, info, root, context, 'mutation'),
                  apiSubscription: getSdk(apiContext, nameSchemaMap, info, root, context, 'subscription'),
                };
              }
            }
            return context[apiName];
          },
        });

        const result = await originalResolver(root, args, proxyContext, info);

        pubsub.publish('resolverDone', { resolverData, result });

        return result;
      } catch (error) {
        pubsub.publish('resolverError', { resolverData, error });

        throw error;
      }
    },
  });
}

function getSdk(
  apiContext: APIContext,
  nameSchemaMap: Map<string, GraphQLSchema>,
  info: GraphQLResolveInfo,
  root: any,
  context: MeshContext,
  focusOnRootType: 'query' | 'mutation' | 'subscription' | 'all'
) {
  return new Proxy(apiContext, {
    get(apiContext, fieldName: string) {
      const apiSchema: GraphQLSchema = nameSchemaMap.get(apiContext.rawSource.name);
      let rootTypes: Record<Operation, GraphQLObjectType> = { query: null, mutation: null, subscription: null };
      switch (focusOnRootType) {
        case 'query':
          rootTypes = {
            query: apiSchema.getQueryType(),
            mutation: null,
            subscription: null,
          };
          break;
        case 'mutation':
          rootTypes = {
            query: null,
            mutation: apiSchema.getMutationType(),
            subscription: null,
          };
          break;
        case 'subscription':
          rootTypes = {
            query: null,
            mutation: null,
            subscription: apiSchema.getSubscriptionType(),
          };
          break;
        default:
          rootTypes = {
            query: apiSchema.getQueryType(),
            mutation: apiSchema.getMutationType(),
            subscription: apiSchema.getSubscriptionType(),
          };
          break;
      }
      let parentType: GraphQLObjectType;
      let operation: Operation;
      let field: GraphQLField<any, any>;
      for (const operationName in rootTypes) {
        const rootType = rootTypes[operationName as Operation];
        if (rootType) {
          const fieldMap = rootType.getFields();
          if (fieldName in fieldMap) {
            operation = operationName as Operation;
            field = fieldMap[fieldName];
            parentType = rootType;
            // TODO: There might be collision here between the same field names in different root types
            // JYC Fix: collision only in 'all' mode, not in other modes
            if (operation === info.operation.operation) {
              break;
            }
          }
        }
      }
      return (methodArgs: any = {}, { depth, fields, selectionSet }: any = {}) => {
        const proxyInfo = createProxyInfo({
          schema: apiSchema,
          parentType,
          field,
          depthLimit: depth,
          root,
          args: methodArgs,
          selectedFields: fields,
          selectionSet,
          info,
          operationKind: operation,
        });
        return delegateToSchema({
          schema: apiContext.rawSource,
          operation,
          fieldName,
          args: methodArgs,
          context,
          info: proxyInfo,
          skipTypeMerging: true,
          skipValidation: true,
        });
      };
    },
  });
}

export function applyResolversHooksToSchema(schema: GraphQLSchema, pubsub: MeshPubSub): GraphQLSchema {
  const sourceResolvers = extractResolvers(schema);

  return addResolversToSchema({
    schema,
    resolvers: applyResolversHooksToResolvers(schema, sourceResolvers, pubsub),
    updateResolversInPlace: true,
  });
}
