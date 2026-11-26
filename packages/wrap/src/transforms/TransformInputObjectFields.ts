import {
  getNamedType,
  isInputType,
  Kind,
  typeFromAST,
  visit,
  visitWithTypeInfo,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLSchema,
  type NamedTypeNode,
  type ObjectFieldNode,
  type ObjectValueNode,
  type OperationDefinitionNode,
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
  transformInputValue,
  type ExecutionRequest,
} from '@graphql-tools/utils';
import {
  type InputFieldNodeTransformer,
  type InputFieldTransformer,
  type InputObjectNodeTransformer,
} from '../types.js';

interface TransformInputObjectFieldsTransformationContext extends Record<string, any> {}

export default class TransformInputObjectFields<
  TContext = Record<string, any>,
> implements Transform<TransformInputObjectFieldsTransformationContext, TContext> {
  private readonly inputFieldTransformer: InputFieldTransformer;
  private readonly inputFieldNodeTransformer: InputFieldNodeTransformer | undefined;

  private readonly inputObjectNodeTransformer: InputObjectNodeTransformer | undefined;

  private transformedSchema: GraphQLSchema | undefined;
  private mapping: Record<string, Record<string, string>>;

  constructor(
    inputFieldTransformer: InputFieldTransformer,
    inputFieldNodeTransformer?: InputFieldNodeTransformer,
    inputObjectNodeTransformer?: InputObjectNodeTransformer,
  ) {
    this.inputFieldTransformer = inputFieldTransformer;
    this.inputFieldNodeTransformer = inputFieldNodeTransformer;
    this.inputObjectNodeTransformer = inputObjectNodeTransformer;
    this.mapping = Object.create(null);
  }

  private _getTransformedSchema() {
    const transformedSchema = this.transformedSchema;
    if (transformedSchema === undefined) {
      throw new Error(
        `The TransformInputObjectFields transform's  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".`,
      );
    }
    return transformedSchema;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    this.transformedSchema = mapSchema(originalWrappingSchema, {
      [MapperKind.INPUT_OBJECT_FIELD]: (inputFieldConfig, fieldName, typeName) => {
        const transformedInputField = this.inputFieldTransformer(
          typeName,
          fieldName,
          inputFieldConfig,
        );
        if (Array.isArray(transformedInputField)) {
          const newFieldName = transformedInputField[0];

          if (newFieldName !== fieldName) {
            if (!Object.prototype.hasOwnProperty.call(this.mapping, typeName)) {
              this.mapping[typeName] = Object.create(null);
            }
            this.mapping[typeName][newFieldName] = fieldName;
          }
        }
        return transformedInputField;
      },
    });

    return this.transformedSchema;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext<TContext>,
    _transformationContext: TransformInputObjectFieldsTransformationContext,
  ): ExecutionRequest {
    const variableValues = originalRequest.variables ?? {};
    const fragments = Object.create(null);

    const operations: Array<OperationDefinitionNode> = [];

    for (const def of originalRequest.document.definitions) {
      if (def.kind === Kind.OPERATION_DEFINITION) {
        operations.push(def);
      } else if (def.kind === Kind.FRAGMENT_DEFINITION) {
        fragments[def.name.value] = def;
      }
    }

    for (const def of operations) {
      const variableDefs = def.variableDefinitions;
      if (variableDefs != null) {
        for (const variableDef of variableDefs) {
          const varName = variableDef.variable.name.value;
          // Cast to NamedTypeNode required until upcomming graphql releases will have TypeNode paramter
          if (!this.transformedSchema) {
            continue;
          }
          const varType = typeFromAST(this.transformedSchema, variableDef.type as NamedTypeNode);
          if (!isInputType(varType)) {
            continue;
          }
          variableValues[varName] = transformInputValue(
            varType,
            variableValues[varName],
            undefined,
            (type, originalValue) => {
              const newValue = Object.create(null);
              const fields = type.getFields();
              for (const key in originalValue) {
                const field = fields[key];
                if (field != null) {
                  const newFieldName = this.mapping[type.name]?.[field.name];
                  if (newFieldName != null) {
                    newValue[newFieldName] = originalValue[field.name];
                  } else {
                    newValue[field.name] = originalValue[field.name];
                  }
                }
              }
              return newValue;
            },
          );
        }
      }
    }

    for (const def of originalRequest.document.definitions.filter(
      def => def.kind === Kind.FRAGMENT_DEFINITION,
    )) {
      fragments[(def as FragmentDefinitionNode).name.value] = def;
    }
    const document = this.transformDocument(
      originalRequest.document,
      this.mapping,
      this.inputFieldNodeTransformer,
      this.inputObjectNodeTransformer,
      originalRequest,
    );

    return {
      ...originalRequest,
      document,
      variables: variableValues,
    };
  }

  private transformDocument(
    document: DocumentNode,
    mapping: Record<string, Record<string, string>>,
    inputFieldNodeTransformer: InputFieldNodeTransformer | undefined,
    inputObjectNodeTransformer: InputObjectNodeTransformer | undefined,
    request: ExecutionRequest,
  ): DocumentNode {
    const typeInfo = getTypeInfo(this._getTransformedSchema());
    const newDocument: DocumentNode = visit(
      document,
      visitWithTypeInfo(typeInfo, {
        [Kind.OBJECT]: {
          leave: (node: ObjectValueNode): ObjectValueNode | void => {
            const parentType = typeInfo.getInputType();
            if (parentType != null) {
              const parentTypeName = getNamedType(parentType).name;
              const newInputFields: Array<ObjectFieldNode> = [];

              for (const inputField of node.fields) {
                const newName = inputField.name.value;

                const transformedInputField =
                  inputFieldNodeTransformer != null
                    ? inputFieldNodeTransformer(parentTypeName, newName, inputField, request)
                    : inputField;

                if (Array.isArray(transformedInputField)) {
                  for (const individualTransformedInputField of transformedInputField) {
                    const typeMapping = mapping[parentTypeName];
                    if (typeMapping == null) {
                      newInputFields.push(individualTransformedInputField);
                      continue;
                    }

                    // Reverse-map each emitted node using its own name, not the
                    // original newName, so unmapped siblings (e.g. mode) pass through.
                    const emittedName = individualTransformedInputField.name.value;
                    const oldName = typeMapping[emittedName];
                    if (oldName == null) {
                      newInputFields.push(individualTransformedInputField);
                      continue;
                    }

                    newInputFields.push({
                      ...individualTransformedInputField,
                      name: {
                        ...individualTransformedInputField.name,
                        value: oldName,
                      },
                    });
                  }
                  continue;
                }

                const typeMapping = mapping[parentTypeName];
                if (typeMapping == null) {
                  newInputFields.push(transformedInputField);
                  continue;
                }

                const oldName = typeMapping[newName];
                if (oldName == null) {
                  newInputFields.push(transformedInputField);
                  continue;
                }

                newInputFields.push({
                  ...transformedInputField,
                  name: {
                    ...transformedInputField.name,
                    value: oldName,
                  },
                });
              }

              const newNode = {
                ...node,
                fields: newInputFields,
              };

              return inputObjectNodeTransformer != null
                ? inputObjectNodeTransformer(parentTypeName, newNode, request)
                : newNode;
            }
          },
        },
      }),
    );
    return newDocument;
  }
}
