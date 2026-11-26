import {
  isScalarType,
  isSpecifiedScalarType,
  Kind,
  visit,
  type GraphQLNamedType,
  type GraphQLSchema,
  type NamedTypeNode,
} from 'graphql';
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
  type RenameTypesOptions,
} from '@graphql-tools/utils';

interface RenameTypesTransformationContext extends Record<string, any> {}

export default class RenameTypes<TContext = Record<string, any>> implements Transform<
  RenameTypesTransformationContext,
  TContext
> {
  private readonly renamer: (name: string) => string | undefined;
  private map: Record<string, string>;
  private reverseMap: Record<string, string>;
  private readonly renameBuiltins: boolean;
  private readonly renameScalars: boolean;

  constructor(renamer: (name: string) => string | undefined, options?: RenameTypesOptions) {
    this.renamer = renamer;
    this.map = Object.create(null);
    this.reverseMap = Object.create(null);
    const { renameBuiltins = false, renameScalars = true } = options != null ? options : {};
    this.renameBuiltins = renameBuiltins;
    this.renameScalars = renameScalars;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    // mapSchema never visits String/ID/Int/Float/Boolean, so renameBuiltins
    // cannot work through MapperKind.TYPE. Reject it explicitly rather than
    // silently ignoring the option.
    if (this.renameBuiltins) {
      throw new Error(
        'RenameTypes: renameBuiltins is not supported because built-in scalars ' +
          '(String, ID, Int, Float, Boolean) are not visited by mapSchema. ' +
          'Pass renameBuiltins: false (the default).',
      );
    }

    const typeMap = originalWrappingSchema.getTypeMap();
    const renameMap: Record<string, string> = Object.create(null);

    // Precompute accepted renames and the final name set so conflict checks do
    // not depend on mapSchema visit order.
    for (const typeName of Object.keys(typeMap) as string[]) {
      const type = typeMap[typeName]!;
      if (typeName.startsWith('__')) {
        continue;
      }
      if (isSpecifiedScalarType(type)) {
        continue;
      }
      if (isScalarType(type) && !this.renameScalars) {
        continue;
      }
      const newName = this.renamer(typeName);
      if (newName !== undefined && newName !== typeName) {
        renameMap[typeName] = newName;
      }
    }

    // Final name set after all accepted renames (excluding skipped conflicts).
    const finalNames = new Set<string>();
    for (const typeName of Object.keys(typeMap) as string[]) {
      if (typeName.startsWith('__')) {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(renameMap, typeName)) {
        finalNames.add(typeName);
      }
    }

    // Resolve conflicts against the final set: a rename to newName is accepted
    // only when newName is not already claimed by an unrenamed type or by an
    // earlier accepted rename. Chains like A→B, B→C are order-independent.
    const targetCounts: Record<string, number> = Object.create(null);
    for (const newName of Object.values(renameMap)) {
      targetCounts[newName] = (targetCounts[newName] ?? 0) + 1;
    }

    for (const [oldName, newName] of Object.entries(renameMap)) {
      const conflict =
        finalNames.has(newName) || (targetCounts[newName] != null && targetCounts[newName]! > 1);
      if (conflict) {
        console.warn(
          `New type name ${newName} for ${oldName} already exists in the schema. Skip renaming.`,
        );
        continue;
      }
      this.map[oldName] = newName;
      this.reverseMap[newName] = oldName;
      finalNames.add(newName);
    }

    return mapSchema(originalWrappingSchema, {
      [MapperKind.TYPE]: (type: GraphQLNamedType) => {
        if (isSpecifiedScalarType(type) && !this.renameBuiltins) {
          return undefined;
        }
        if (isScalarType(type) && !this.renameScalars) {
          return undefined;
        }
        const newName = this.map[type.name];
        if (newName != null) {
          return renameType(type, newName);
        }
        return undefined;
      },

      [MapperKind.ROOT_OBJECT]() {
        return undefined;
      },
    });
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    _transformationContext: RenameTypesTransformationContext,
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
    _transformationContext?: RenameTypesTransformationContext,
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
