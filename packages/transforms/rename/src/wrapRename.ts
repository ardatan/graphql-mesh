import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { RenameTypes, RenameObjectFields, RenameInputObjectFields } from '@graphql-tools/wrap';
import { ExecutionResult, ExecutionRequest } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { resolvers as scalarsResolversMap } from 'graphql-scalars';

const ignoreList = [
  'date',
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
  ...Object.keys(scalarsResolversMap),
];

export default class WrapRename implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.RenameTransform>) {
    const { config } = options;
    for (const change of config.renames) {
      const {
        from: { type: fromTypeName, field: fromFieldName },
        to: { type: toTypeName, field: toFieldName },
        useRegExpForTypes,
        useRegExpForFields,
      } = change;

      const regExpFlags = change.regExpFlags || undefined;

      if (fromTypeName !== toTypeName) {
        let replaceTypeNameFn: (t: string) => string;
        if (useRegExpForTypes) {
          const typeNameRegExp = new RegExp(fromTypeName, regExpFlags);
          replaceTypeNameFn = (t: string) => t.replace(typeNameRegExp, toTypeName);
        } else {
          replaceTypeNameFn = t => (t === fromTypeName ? toTypeName : t);
        }
        this.transforms.push(
          new RenameTypes(typeName => {
            if (typeName in scalarsResolversMap || ignoreList.includes(typeName)) {
              return typeName;
            }
            return replaceTypeNameFn(typeName);
          })
        );
      }

      if (fromFieldName && toFieldName && fromFieldName !== toFieldName) {
        let replaceFieldNameFn: (typeName: string, fieldName: string) => string;

        if (useRegExpForFields) {
          const fieldNameRegExp = new RegExp(fromFieldName, regExpFlags);
          replaceFieldNameFn = (typeName, fieldName) =>
            typeName === toTypeName ? fieldName.replace(fieldNameRegExp, toFieldName) : fieldName;
        } else {
          replaceFieldNameFn = (typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName;
        }
        this.transforms.push(new RenameObjectFields(replaceFieldNameFn));
        this.transforms.push(new RenameInputObjectFields(replaceFieldNameFn));
      }
    }
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ) {
    return applySchemaTransforms(originalWrappingSchema, subschemaConfig, transformedSchema, this.transforms);
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ) {
    return applyRequestTransforms(originalRequest, delegationContext, transformationContext, this.transforms);
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    return applyResultTransforms(originalResult, delegationContext, transformationContext, this.transforms);
  }
}
