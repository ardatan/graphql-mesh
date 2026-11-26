import { Kind, visit, type GraphQLSchema, type NamedTypeNode } from 'graphql';
import {
  type DelegationContext,
  type SubschemaConfig,
  type Transform,
} from '@graphql-tools/delegate';
import {
  MapperKind,
  mapSchema,
  renameType,
  visitData,
  type ExecutionRequest,
  type ExecutionResult,
} from '@graphql-tools/utils';

interface RenameRootTypesTransformationContext extends Record<string, any> {}

export default class RenameRootTypes<TContext = Record<string, any>> implements Transform<
  RenameRootTypesTransformationContext,
  TContext
> {
  private readonly renamer: (name: string) => string | undefined;
  private map: Record<string, string>;
  private reverseMap: Record<string, string>;

  constructor(renamer: (name: string) => string | undefined) {
    this.renamer = renamer;
    this.map = Object.create(null);
    this.reverseMap = Object.create(null);
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    const rootTypes = [
      originalWrappingSchema.getQueryType(),
      originalWrappingSchema.getMutationType(),
      originalWrappingSchema.getSubscriptionType(),
    ].filter((type): type is NonNullable<typeof type> => type != null);

    const proposed: Array<{ oldName: string; newName: string }> = [];
    for (const type of rootTypes) {
      const oldName = type.name;
      const newName = this.renamer(oldName);
      if (newName !== undefined && newName !== oldName) {
        proposed.push({ oldName, newName });
      }
    }

    // Preflight: reject collisions among final root type names.
    const finalNames = new Map<string, string>(); // finalName -> source oldName
    for (const type of rootTypes) {
      const proposedRename = proposed.find(p => p.oldName === type.name);
      const finalName = proposedRename?.newName ?? type.name;
      const existing = finalNames.get(finalName);
      if (existing != null && existing !== type.name) {
        throw new Error(
          `RenameRootTypes: root type name collision on "${finalName}" ` +
            `(from "${existing}" and "${type.name}").`,
        );
      }
      finalNames.set(finalName, type.name);
    }

    for (const { oldName, newName } of proposed) {
      this.map[oldName] = newName;
      this.reverseMap[newName] = oldName;
    }

    return mapSchema(originalWrappingSchema, {
      [MapperKind.ROOT_OBJECT]: type => {
        const newName = this.map[type.name];
        if (newName != null) {
          return renameType(type, newName);
        }
        return undefined;
      },
    });
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    _transformationContext: RenameRootTypesTransformationContext,
  ): ExecutionRequest {
    const document = visit(originalRequest.document, {
      [Kind.NAMED_TYPE]: (node: NamedTypeNode) => {
        const name = node.name.value;
        if (name in this.reverseMap) {
          return {
            ...node,
            name: {
              kind: Kind.NAME,
              value: this.reverseMap[name],
            },
          };
        }
        return undefined;
      },
    });
    return {
      ...originalRequest,
      document,
    };
  }

  public transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext<TContext>,
    _transformationContext?: RenameRootTypesTransformationContext,
  ): ExecutionResult {
    return {
      ...originalResult,
      data: visitData(originalResult.data, object => {
        const typeName = object?.__typename;
        if (typeName != null && typeName in this.map) {
          object.__typename = this.map[typeName];
        }
        return object;
      }),
    };
  }
}
