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
import { createCreateEntitySetResolver } from './resolvers/createEntitySetResolver.js';
import { createDeleteEntitySetByIdentifierResolver } from './resolvers/deleteEntitySetByIdentifierResolver.js';
import { createEntitySetByIdentifierResolver } from './resolvers/entitySetByIdentifierResolver.js';
import { createEntitySetCountResolver } from './resolvers/entitySetCountResolver.js';
import { createEntitySetResolver } from './resolvers/entitySetResolver.js';
import { createNavPropResolver } from './resolvers/navPropResolver.js';
import { rootResolver } from './resolvers/rootResolver.js';
import { createSingletonResolver } from './resolvers/singletonResolver.js';
import { createSingularNavResolver } from './resolvers/singularNavResolver.js';
import { createUnboundActionResolver } from './resolvers/unboundActionResolver.js';
import { createUnboundFunctionResolver } from './resolvers/unboundFunction.js';
import { createUpdateEntitySetResolver } from './resolvers/updateEntitySetResolver.js';

export { TransportDirective };

export type TransportDirectiveArgs = SharedTransportDirectiveArgs<{
  batch: 'none' | 'json' | 'multipart';
  expandNavProps: boolean;
}> & { kind: 'odata' };

/**
 * Federation-compatible entity key; OData reads `fields` for URLs / `$select`.
 * Prefer putting `@key` on type extensions only — Mesh Compose imports Federation’s
 * `@key` via `@link`, so registering this definition on a composed subgraph duplicates it.
 */
export const KeyDirective = new GraphQLDirective({
  name: 'key',
  isRepeatable: true,
  args: {
    fields: {
      type: new GraphQLNonNull(GraphQLString),
    },
    resolvable: {
      type: GraphQLBoolean,
      defaultValue: true,
    },
  },
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INTERFACE],
});

export interface KeyDirectiveArgs {
  fields: string;
  resolvable?: boolean;
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
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface EntitySetByIdentifierDirectiveArgs {
  entitySetName: string;
  identifierFieldName: string;
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
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface DeleteEntitySetDirectiveArgs {
  entitySetName: string;
  identifierFieldName: string;
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
  },
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

export interface UpdateEntitySetDirectiveArgs {
  entitySetName: string;
  identifierFieldName: string;
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
  /** Omitted when empty (single-namespace schemas). */
  aliasNamespaceMap?: [string, string][];
  /** Omit unless true; runtime treats missing as false. */
  multipleSchemas?: boolean;
  namespaces: string[];
}

export interface DirectiveArgsMap {
  key?: KeyDirectiveArgs;
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

export function processDirectives({ schema, fetchFn }: ProcessDirectivesArgs) {
  const schemaLevelDirectives = getDirectiveExtensions<DirectiveArgsMap>(schema);
  const transportDirective = schemaLevelDirectives?.transport?.[0];
  if (!transportDirective) {
    throw new Error('Missing transport directive');
  }
  const operationHeaders = Array.isArray(transportDirective.headers)
    ? Object.fromEntries(transportDirective.headers)
    : transportDirective.headers;
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

  const endpoint = stringInterpolator.parse(transportDirective.location, {
    env: process.env,
  });

  const dataloaderFactory = getDataloaderFactory({
    endpoint,
    fetchFn,
    headersFactory,
    batchMode: transportDirective.options?.batch || 'none',
  });

  return mapSchema(schema, {
    [MapperKind.ABSTRACT_TYPE]: type => {
      const typeDirectives = getDirectiveExtensions<DirectiveArgsMap>(type);
      const abstractTypeDirectives = typeDirectives?.abstractType;
      if (abstractTypeDirectives?.length) {
        const abstractTypeDirective = abstractTypeDirectives[0];
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
      if (fieldDirectives?.boundAction?.length) {
        const boundActionDirective = fieldDirectives.boundAction[0];
        fieldConfig.resolve = createBoundActionResolver({
          actionRef: boundActionDirective.actionRef,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.boundFunction?.length) {
        const boundFunctionDirective = fieldDirectives.boundFunction[0];
        fieldConfig.resolve = createBoundFunctionResolver({
          functionRef: boundFunctionDirective.functionRef,
          expandNavProps: transportDirective.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.createEntitySet?.length) {
        const createEntitySetDirective = fieldDirectives.createEntitySet[0];
        fieldConfig.resolve = createCreateEntitySetResolver({
          endpoint,
          entitySetName: createEntitySetDirective.entitySetName,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.deleteEntitySet?.length) {
        const deleteEntitySetDirective = fieldDirectives.deleteEntitySet[0];
        fieldConfig.resolve = createDeleteEntitySetByIdentifierResolver({
          endpoint,
          entitySetName: deleteEntitySetDirective.entitySetName,
          identifierFieldName: deleteEntitySetDirective.identifierFieldName,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.entitySetByIdentifier?.length) {
        const entitySetByIdentifierDirective = fieldDirectives.entitySetByIdentifier[0];
        fieldConfig.resolve = createEntitySetByIdentifierResolver({
          endpoint,
          entitySetName: entitySetByIdentifierDirective.entitySetName,
          identifierFieldName: entitySetByIdentifierDirective.identifierFieldName,
          expandNavProps: transportDirective.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.entitySetCount?.length) {
        const entitySetCountDirective = fieldDirectives.entitySetCount[0];
        fieldConfig.resolve = createEntitySetCountResolver({
          endpoint,
          entitySetName: entitySetCountDirective.entitySetName,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.entitySet?.length) {
        const entitySetDirective = fieldDirectives.entitySet[0];
        fieldConfig.resolve = createEntitySetResolver({
          endpoint,
          entitySetName: entitySetDirective.entitySetName,
          expandNavProps: transportDirective.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.navProp?.length) {
        const navPropDirective = fieldDirectives.navProp[0];
        fieldConfig.resolve = createNavPropResolver({
          navigationPropertyName: navPropDirective.navigationPropertyName,
          expandNavProps: transportDirective.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.pluralNav?.length) {
        const pluralNavDirective = fieldDirectives.pluralNav[0];
        fieldConfig.resolve = createNavPropResolver({
          navigationPropertyName: pluralNavDirective.navigationPropertyName,
          expandNavProps: transportDirective.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.resolveRoot?.length) {
        fieldConfig.resolve = rootResolver;
      } else if (fieldDirectives?.singleton?.length) {
        const singletonDirective = fieldDirectives.singleton[0];
        fieldConfig.resolve = createSingletonResolver({
          singletonName: singletonDirective.singletonName,
          endpoint,
          expandNavProps: transportDirective.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.singularNav?.length) {
        const singularNavDirective = fieldDirectives.singularNav[0];
        fieldConfig.resolve = createSingularNavResolver({
          navigationPropertyName: singularNavDirective.navigationPropertyName,
          expandNavProps: transportDirective.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.unboundAction?.length) {
        const unboundActionDirective = fieldDirectives.unboundAction[0];
        fieldConfig.resolve = createUnboundActionResolver({
          actionName: unboundActionDirective.actionName,
          endpoint,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.unboundFunction?.length) {
        const unboundFunctionDirective = fieldDirectives.unboundFunction[0];
        fieldConfig.resolve = createUnboundFunctionResolver({
          functionName: unboundFunctionDirective.functionName,
          endpoint,
          expandNavProps: transportDirective.options?.expandNavProps,
          dataloaderFactory,
          headersFactory,
        });
      } else if (fieldDirectives?.updateEntitySet?.length) {
        const updateEntitySetDirective = fieldDirectives.updateEntitySet[0];
        fieldConfig.resolve = createUpdateEntitySetResolver({
          endpoint,
          entitySetName: updateEntitySetDirective.entitySetName,
          identifierFieldName: updateEntitySetDirective.identifierFieldName,
          dataloaderFactory,
          headersFactory,
        });
      }
      return fieldConfig;
    },
  });
}
