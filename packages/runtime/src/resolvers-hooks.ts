import { Hooks } from '@graphql-mesh/types';
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
import { IResolvers, Operation, buildOperationNodeForField, SelectedFields } from '@graphql-tools/utils';
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

function createProxyInfo({
  schema,
  parentType,
  field,
  depthLimit = 2,
  root,
  args,
  selectedFields,
  selectionSet,
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
      kind: 'query',
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
  hooks: Hooks
): IResolvers {
  return composeResolvers(resolvers, {
    '*.*': originalResolver => async (root, args, context, info) => {
      const resolverData = {
        root,
        args,
        context,
        info,
      };
      hooks.emit('resolverCalled', resolverData);

      try {
        const proxyContext = new Proxy(
          {},
          {
            get(_, apiName: string) {
              if (isMeshContext(context)) {
                const apiContext = context[apiName];
                if (isAPIContext(apiContext)) {
                  const sdk = new Proxy(
                    {},
                    {
                      get(_, fieldName: string) {
                        const apiSchema: GraphQLSchema = unifiedSchema.extensions.sourceMap.get(apiContext.rawSource);
                        const rootTypes: Record<Operation, GraphQLObjectType> = {
                          query: apiSchema.getQueryType(),
                          mutation: apiSchema.getMutationType(),
                          subscription: apiSchema.getSubscriptionType(),
                        };
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
                          });
                          return delegateToSchema({
                            schema: apiSchema,
                            operation,
                            fieldName,
                            args: methodArgs,
                            context,
                            info: proxyInfo,
                          });
                        };
                      },
                    }
                  );
                  return {
                    ...apiContext,
                    api: sdk,
                  };
                }
              }
              return context[apiName];
            },
          }
        );

        const result = await originalResolver(root, args, proxyContext, info);

        hooks.emit('resolverDone', resolverData, result);

        return result;
      } catch (e) {
        hooks.emit('resolverError', resolverData, e);

        throw e;
      }
    },
  });
}

export function applyResolversHooksToSchema(schema: GraphQLSchema, hooks: Hooks): GraphQLSchema {
  const sourceResolvers = extractResolvers(schema);

  return addResolversToSchema({
    schema,
    resolvers: applyResolversHooksToResolvers(schema, sourceResolvers, hooks),
    updateResolversInPlace: true,
  });
}
