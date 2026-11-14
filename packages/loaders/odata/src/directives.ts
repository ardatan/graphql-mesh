import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLList,
  GraphQLString,
  type GraphQLSchema,
} from 'graphql';
import type { MeshFetch } from '@graphql-mesh/types';
import {
  TransportDirective,
  type TransportDirectiveArgs as SharedTransportDirectiveArgs,
} from '@graphql-mesh/utils';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';
import { createAbstractTypeResolver } from './resolvers/abstractTypeResolver.js';

export { TransportDirective };

export type TransportDirectiveArgs = SharedTransportDirectiveArgs<{
  odata?: {
    batch?: 'none' | 'json' | 'multipart';
    expandNavProps?: boolean;
  };
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
  /** @deprecated Unused — Connectors handle HTTP. Kept for call-site compat. */
  fetchFn?: MeshFetch;
}

/**
 * Wire `@abstractType` → `resolveType` from `@odata.type`.
 * All HTTP (CRUD / nav / bound / unbound) is Federation `@connect` via transport-rest.
 */
export function processDirectives({ schema }: ProcessDirectivesArgs) {
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
  });
}
