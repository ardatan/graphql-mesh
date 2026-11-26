import {
  Kind,
  visit,
  visitWithTypeInfo,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLSchema,
  type GraphQLType,
  type SelectionNode,
  type SelectionSetNode,
  type TypeInfo,
} from 'graphql';
import {
  getTypeInfo,
  type DelegationContext,
  type SubschemaConfig,
  type Transform,
} from '@graphql-tools/delegate';
import {
  MapperKind,
  mapSchema,
  visitData,
  type ExecutionRequest,
  type ExecutionResult,
  type Maybe,
} from '@graphql-tools/utils';
import {
  type DataTransformer,
  type ErrorsTransformer,
  type FieldNodeTransformer,
  type FieldTransformer,
} from '../types.js';

interface TransformCompositeFieldsTransformationContext extends Record<string, any> {}

export default class TransformCompositeFields<TContext = Record<string, any>> implements Transform<
  TransformCompositeFieldsTransformationContext,
  TContext
> {
  private readonly fieldTransformer: FieldTransformer<TContext>;
  private readonly fieldNodeTransformer: FieldNodeTransformer | undefined;
  private readonly dataTransformer: DataTransformer | undefined;
  private readonly errorsTransformer: ErrorsTransformer | undefined;
  private transformedSchema: GraphQLSchema | undefined;
  private typeInfo: TypeInfo | undefined;
  private mapping: Record<string, Record<string, string>>;
  private subscriptionTypeName: string | undefined;

  constructor(
    fieldTransformer: FieldTransformer<TContext>,
    fieldNodeTransformer?: FieldNodeTransformer,
    dataTransformer?: DataTransformer,
    errorsTransformer?: ErrorsTransformer,
  ) {
    this.fieldTransformer = fieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
    this.dataTransformer = dataTransformer;
    this.errorsTransformer = errorsTransformer;
    this.mapping = Object.create(null);
  }

  private _getTypeInfo() {
    const typeInfo = this.typeInfo;
    if (typeInfo === undefined) {
      throw new Error(
        `The TransformCompositeFields transform's  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".`,
      );
    }
    return typeInfo;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    this.transformedSchema = mapSchema(originalWrappingSchema, {
      [MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName, typeName) => {
        const transformedField = this.fieldTransformer(typeName, fieldName, fieldConfig);
        if (Array.isArray(transformedField)) {
          const newFieldName = transformedField[0];

          if (newFieldName !== fieldName) {
            if (!Object.prototype.hasOwnProperty.call(this.mapping, typeName)) {
              this.mapping[typeName] = Object.create(null);
            }
            this.mapping[typeName][newFieldName] = fieldName;
          }
        }
        return transformedField;
      },
    });
    this.typeInfo = getTypeInfo(this.transformedSchema);
    this.subscriptionTypeName = originalWrappingSchema.getSubscriptionType()?.name;

    return this.transformedSchema;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    transformationContext: TransformCompositeFieldsTransformationContext,
  ): ExecutionRequest {
    const document = originalRequest.document;
    return {
      ...originalRequest,
      document: this.transformDocument(document, transformationContext),
    };
  }

  public transformResult(
    result: ExecutionResult,
    _delegationContext: DelegationContext<TContext>,
    transformationContext: TransformCompositeFieldsTransformationContext,
  ): ExecutionResult {
    const dataTransformer = this.dataTransformer;
    if (dataTransformer != null) {
      result.data = visitData(result.data, value => dataTransformer(value, transformationContext));
    }
    if (this.errorsTransformer != null && Array.isArray(result.errors)) {
      result.errors = this.errorsTransformer(result.errors, transformationContext);
    }
    return result;
  }

  private transformDocument(
    document: DocumentNode,
    transformationContext: Record<string, any>,
  ): DocumentNode {
    const fragments = Object.create(null);
    for (const def of document.definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) {
        fragments[def.name.value] = def;
      }
    }
    return visit(
      document,
      visitWithTypeInfo(this._getTypeInfo(), {
        [Kind.SELECTION_SET]: {
          leave: node =>
            this.transformSelectionSet(node, this._getTypeInfo(), fragments, transformationContext),
        },
      }),
    );
  }

  private transformSelectionSet(
    node: SelectionSetNode,
    typeInfo: TypeInfo,
    fragments: Record<string, FragmentDefinitionNode>,
    transformationContext: Record<string, any>,
  ): SelectionSetNode | undefined {
    const parentType: Maybe<GraphQLType> = typeInfo.getParentType();
    if (parentType == null) {
      return undefined;
    }

    const parentTypeName = parentType.name;
    const newSelections: Array<SelectionNode> = [];

    for (const selection of node.selections) {
      if (selection.kind !== Kind.FIELD) {
        newSelections.push(selection);
        continue;
      }

      const newName = selection.name.value;

      let transformedSelection: Maybe<SelectionNode | Array<SelectionNode>>;
      if (this.fieldNodeTransformer == null) {
        transformedSelection = selection;
      } else {
        transformedSelection = this.fieldNodeTransformer(
          parentTypeName,
          newName,
          selection,
          fragments,
          transformationContext,
        );
        transformedSelection =
          transformedSelection === undefined ? selection : transformedSelection;
      }

      if (transformedSelection == null) {
        continue;
      } else if (Array.isArray(transformedSelection)) {
        for (const node of transformedSelection) {
          newSelections.push(node);
        }
        continue;
      } else if (transformedSelection.kind !== Kind.FIELD) {
        newSelections.push(transformedSelection);
        continue;
      }

      const typeMapping = this.mapping[parentTypeName];
      if (typeMapping == null) {
        newSelections.push(transformedSelection);
        continue;
      }

      const oldName = this.mapping[parentTypeName]![newName];
      if (oldName == null) {
        newSelections.push(transformedSelection);
        continue;
      }

      newSelections.push({
        ...transformedSelection,
        name: {
          kind: Kind.NAME,
          value: oldName,
        },
        alias: {
          kind: Kind.NAME,
          value: transformedSelection.alias?.value ?? newName,
        },
      });
    }

    // Only an unconditional `__typename` is a guaranteed internal type tag.
    // Conditional selections (with @skip/@include) keep their client alias and
    // directives; a separate internal tag is requested when transformers need it.
    const isTypenameSelected = newSelections.some(
      selection =>
        selection.kind === Kind.FIELD &&
        selection.name.value === '__typename' &&
        (!selection.alias || selection.alias.value === '__typename') &&
        (selection.directives == null || selection.directives.length === 0),
    );

    // See https://github.com/ardatan/graphql-tools/issues/2282
    if (
      !isTypenameSelected &&
      (this.dataTransformer != null || this.errorsTransformer != null) &&
      (this.subscriptionTypeName == null || parentTypeName !== this.subscriptionTypeName)
    ) {
      newSelections.push({
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      });
    }

    return {
      ...node,
      selections: newSelections,
    };
  }
}
