import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  type GraphQLSchema,
} from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import {
  getInterpolatedHeadersFactory,
  stringInterpolator,
  type ResolverData,
} from '@graphql-mesh/string-interpolation';
import type { MeshFetch } from '@graphql-mesh/types';
import {
  TransportDirective,
  type TransportDirectiveArgs as SharedTransportDirectiveArgs,
} from '@graphql-mesh/utils';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';
import { getDataloaderFactory } from './getDataloaderFactory.js';
import { createAbstractTypeResolver } from './resolvers/abstractTypeResolver.js';
import { createBoundActionResolver } from './resolvers/boundActionResolver.js';
import { createBoundFunctionResolver } from './resolvers/boundFunctionResolver.js';
import { createNavPropResolver } from './resolvers/navPropResolver.js';
import { rootResolver } from './resolvers/rootResolver.js';
import { createSingularNavResolver } from './resolvers/singularNavResolver.js';
import { createUnboundActionResolver } from './resolvers/unboundActionResolver.js';
import { createUnboundFunctionResolver } from './resolvers/unboundFunction.js';

export { TransportDirective };

export type TransportDirectiveArgs = SharedTransportDirectiveArgs<{
  batch: 'none' | 'json' | 'multipart';
  expandNavProps: boolean;
}> & { kind: 'rest' };

export const EntityInfoDirective = new GraphQLDirective({
  name: 'entityInfo',
  args: {
    actualFields: {
      type: new GraphQLList(GraphQLString),
    },
    navigationFields: {
      type: new GraphQLList(GraphQLString),
    },
    identifierFieldName: {
      type: GraphQLString,
    },
    identifierFieldTypeRef: {
      type: GraphQLString,
    },
    isOpenType: {
      type: GraphQLBoolean,
    },
  },
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INTERFACE],
});

export interface EntityInfoDirectiveArgs {
  actualFields: string[];
  navigationFields: string[];
  identifierFieldName?: string;
  identifierFieldTypeRef?: string;
  isOpenType: boolean;
}

export const SingularNavDirective = new GraphQLDirective({
  name: 'singularNav',
  args: {
    navigationPropertyName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface SingularNavDirectiveArgs {
  navigationPropertyName: string;
}

export const PluralNavDirective = new GraphQLDirective({
  name: 'pluralNav',
  args: {
    navigationPropertyName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface PluralNavDirectiveArgs {
  navigationPropertyName: string;
}

export const NavPropDirective = new GraphQLDirective({
  name: 'navProp',
  args: {
    navigationPropertyName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface NavPropDirectiveArgs {
  navigationPropertyName: string;
}

export const ResolveRootDirective = new GraphQLDirective({
  name: 'resolveRoot',
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface ResolveRootDirectiveArgs {}

export const UnboundFunctionDirective = new GraphQLDirective({
  name: 'unboundFunction',
  args: {
    functionName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface UnboundFunctionDirectiveArgs {
  functionName: string;
}

export const BoundFunctionDirective = new GraphQLDirective({
  name: 'boundFunction',
  args: {
    functionRef: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface BoundFunctionDirectiveArgs {
  functionRef: string;
}

export const UnboundActionDirective = new GraphQLDirective({
  name: 'unboundAction',
  args: {
    actionName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface UnboundActionDirectiveArgs {
  actionName: string;
}

export const BoundActionDirective = new GraphQLDirective({
  name: 'boundAction',
  args: {
    actionRef: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface BoundActionDirectiveArgs {
  actionRef: string;
}

export const SingletonDirective = new GraphQLDirective({
  name: 'singleton',
  args: {
    singletonName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface SingletonDirectiveArgs {
  singletonName: string;
}

export const EntitySetDirective = new GraphQLDirective({
  name: 'entitySet',
  args: {
    entitySetName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface EntitySetDirectiveArgs {
  entitySetName: string;
}

export const EntitySetByIdentifierDirective = new GraphQLDirective({
  name: 'entitySetByIdentifier',
  args: {
    entitySetName: {
      type: GraphQLString,
    },
    identifierFieldName: {
      type: GraphQLString,
    },
    identifierFieldTypeRef: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface EntitySetByIdentifierDirectiveArgs {
  entitySetName: string;
  identifierFieldName: string;
  identifierFieldTypeRef: string;
}

export const EntitySetCountDirective = new GraphQLDirective({
  name: 'entitySetCount',
  args: {
    entitySetName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface EntitySetCountDirectiveArgs {
  entitySetName: string;
}

export const CreateEntitySetDirective = new GraphQLDirective({
  name: 'createEntitySet',
  args: {
    entitySetName: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface CreateEntitySetDirectiveArgs {
  entitySetName: string;
}

export const DeleteEntitySetDirective = new GraphQLDirective({
  name: 'deleteEntitySet',
  args: {
    entitySetName: {
      type: GraphQLString,
    },
    identifierFieldName: {
      type: GraphQLString,
    },
    identifierFieldTypeRef: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface DeleteEntitySetDirectiveArgs {
  entitySetName: string;
  identifierFieldName: string;
  identifierFieldTypeRef: string;
}

export const UpdateEntitySetDirective = new GraphQLDirective({
  name: 'updateEntitySet',
  args: {
    entitySetName: {
      type: GraphQLString,
    },
    identifierFieldName: {
      type: GraphQLString,
    },
    identifierFieldTypeRef: {
      type: GraphQLString,
    },
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface UpdateEntitySetDirectiveArgs {
  entitySetName: string;
  identifierFieldName: string;
  identifierFieldTypeRef: string;
}

export const AbstractTypeDirective = new GraphQLDirective({
  name: 'abstractType',
  args: {
    entityTypeName: {
      type: GraphQLString,
    },
    isAbstract: {
      type: GraphQLBoolean,
    },
    aliasNamespaceMap: {
      type: new GraphQLList(new GraphQLList(GraphQLString)),
    },
    multipleSchemas: {
      type: GraphQLBoolean,
    },
    namespaces: {
      type: new GraphQLList(GraphQLString),
    },
  },
  locations: [DirectiveLocation.INTERFACE, DirectiveLocation.OBJECT],
});

export interface AbstractTypeDirectiveArgs {
  entityTypeName: string;
  isAbstract: boolean;
  aliasNamespaceMap: [string, string][];
  multipleSchemas: boolean;
  namespaces: string[];
}

export interface DirectiveArgsMap {
  entityInfo?: EntityInfoDirectiveArgs;
  singularNav?: SingularNavDirectiveArgs;
  pluralNav?: PluralNavDirectiveArgs;
  navProp?: NavPropDirectiveArgs;
  resolveRoot?: ResolveRootDirectiveArgs;
  unboundFunction?: UnboundFunctionDirectiveArgs;
  boundFunction?: BoundFunctionDirectiveArgs;
  unboundAction?: UnboundActionDirectiveArgs;
  boundAction?: BoundActionDirectiveArgs;
  singleton?: SingletonDirectiveArgs;
  entitySet?: EntitySetDirectiveArgs;
  entitySetByIdentifier?: EntitySetByIdentifierDirectiveArgs;
  entitySetCount?: EntitySetCountDirectiveArgs;
  createEntitySet?: CreateEntitySetDirectiveArgs;
  deleteEntitySet?: DeleteEntitySetDirectiveArgs;
  updateEntitySet?: UpdateEntitySetDirectiveArgs;
  abstractType?: AbstractTypeDirectiveArgs;
  transport?: TransportDirectiveArgs;
  [key: string]: unknown;
}

export interface ProcessDirectivesArgs {
  schema: GraphQLSchema;
  fetchFn: MeshFetch;
}

/**
 * Residual Mesh OData resolvers: abstract `@odata.type` (+ legacy `@resolveRoot` if present).
 * CRUD, nav, bound/unbound ops and open-type `rest` are Federation `@connect` (`rest: $`).
 */
export function processDirectives({ schema, fetchFn }: ProcessDirectivesArgs) {
  const schemaLevelDirectives = getDirectiveExtensions<DirectiveArgsMap>(schema);
  const transportDirective = schemaLevelDirectives?.transport?.[0];
  const sourceDirective = (schemaLevelDirectives as any)?.source?.[0] as
    { http?: { baseURL?: string; headers?: Array<{ name: string; value?: string }> } } | undefined;
  const endpointRaw = sourceDirective?.http?.baseURL || transportDirective?.location || undefined;
  if (!endpointRaw) {
    throw new Error('Missing @source.http.baseURL or @transport.location for OData');
  }
  const headerEntries: [string, string][] = [];
  if (Array.isArray(transportDirective?.headers)) {
    headerEntries.push(...(transportDirective.headers as [string, string][]));
  } else if (transportDirective?.headers && typeof transportDirective.headers === 'object') {
    headerEntries.push(...Object.entries(transportDirective.headers as Record<string, string>));
  }
  if (sourceDirective?.http?.headers) {
    for (const h of sourceDirective.http.headers) {
      if (h?.name && h.value != null) {
        headerEntries.push([h.name, h.value]);
      }
    }
  }
  const operationHeaders = Object.fromEntries(headerEntries);
  const origHeadersFactory = getInterpolatedHeadersFactory(operationHeaders);
  const headersFactory = (resolverData: ResolverData, method: string) => {
    const headers = origHeadersFactory(resolverData);
    if (headers.accept == null) {
      headers.accept = 'application/json';
    }
    if (headers['content-type'] == null && method !== 'GET') {
      headers['content-type'] = 'application/json';
    }
    return headers;
  };

  const endpoint = stringInterpolator.parse(endpointRaw, {
    env: process.env,
  });

  const dataloaderFactory = getDataloaderFactory({
    endpoint,
    fetchFn,
    headersFactory,
    batchMode: transportDirective?.options?.batch || 'none',
  });

  /** graphql-compose often stores a single directive args object; `@link` AST uses arrays. */
  const firstDir = <T>(value: T | T[] | null | undefined): T | undefined => {
    if (value == null) {
      return undefined;
    }
    return Array.isArray(value) ? value[0] : value;
  };

  return mapSchema(schema, {
    [MapperKind.ABSTRACT_TYPE]: type => {
      const typeDirectives = getDirectiveExtensions<DirectiveArgsMap>(type);
      const abstractTypeDirective = firstDir(typeDirectives?.abstractType);
      if (abstractTypeDirective) {
        const typePrototype = Object.getPrototypeOf(type);
        return new typePrototype.constructor({
          ...type.toConfig(),
          resolveType: createAbstractTypeResolver({
            entityTypeName: abstractTypeDirective.entityTypeName,
            isAbstract: abstractTypeDirective.isAbstract,
            aliasNamespaceMap: new Map(abstractTypeDirective.aliasNamespaceMap ?? []),
            multipleSchemas: abstractTypeDirective.multipleSchemas ?? false,
            namespaces: new Set(abstractTypeDirective.namespaces ?? []),
          }),
        });
      }
    },
    [MapperKind.COMPOSITE_FIELD]: fieldConfig => {
      const fieldDirectives = getDirectiveExtensions<DirectiveArgsMap>(fieldConfig);
      // Root CRUD `@connect` resolvers win. Mesh-bound ops / nav must overwrite
      // stubs from `hydrateEntityStubFieldResolvers`.
      const hasConnect = Boolean(firstDir(fieldDirectives?.connect as any));
      if (hasConnect && typeof fieldConfig.resolve === 'function') {
        return fieldConfig;
      }
      const boundActionDirective = firstDir(fieldDirectives?.boundAction);
      const boundFunctionDirective = firstDir(fieldDirectives?.boundFunction);
      const navPropDirective = firstDir(fieldDirectives?.navProp);
      const pluralNavDirective = firstDir(fieldDirectives?.pluralNav);
      const resolveRootDirective = firstDir(fieldDirectives?.resolveRoot);
      const singularNavDirective = firstDir(fieldDirectives?.singularNav);
      const unboundActionDirective = firstDir(fieldDirectives?.unboundAction);
      const unboundFunctionDirective = firstDir(fieldDirectives?.unboundFunction);
      if (boundActionDirective) {
        fieldConfig.resolve = createBoundActionResolver({
          actionRef: boundActionDirective.actionRef,
          dataloaderFactory,
          headersFactory,
        });
      } else if (boundFunctionDirective) {
        fieldConfig.resolve = createBoundFunctionResolver({
          functionRef: boundFunctionDirective.functionRef,
          expandNavProps: transportDirective?.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (navPropDirective) {
        fieldConfig.resolve = createNavPropResolver({
          navigationPropertyName: navPropDirective.navigationPropertyName,
          expandNavProps: transportDirective?.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (pluralNavDirective) {
        fieldConfig.resolve = createNavPropResolver({
          navigationPropertyName: pluralNavDirective.navigationPropertyName,
          expandNavProps: transportDirective?.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (resolveRootDirective) {
        fieldConfig.resolve = rootResolver;
      } else if (singularNavDirective) {
        fieldConfig.resolve = createSingularNavResolver({
          navigationPropertyName: singularNavDirective.navigationPropertyName,
          expandNavProps: transportDirective?.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (unboundActionDirective) {
        fieldConfig.resolve = createUnboundActionResolver({
          actionName: unboundActionDirective.actionName,
          endpoint,
          dataloaderFactory,
          headersFactory,
        });
      } else if (unboundFunctionDirective) {
        fieldConfig.resolve = createUnboundFunctionResolver({
          functionName: unboundFunctionDirective.functionName,
          endpoint,
          expandNavProps: transportDirective?.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      }
      // entitySet* / singleton / create|update|delete → `@connect` (transport-rest)
      return fieldConfig;
    },
  });
}
