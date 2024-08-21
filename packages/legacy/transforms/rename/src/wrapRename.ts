import type { GraphQLSchema } from 'graphql';
import type { YamlConfig } from '@graphql-mesh/types';
import {
  applyRequestTransforms,
  applyResultTransforms,
  applySchemaTransforms,
} from '@graphql-mesh/utils';
import type { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import type { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
// RenameTypesOptions
import {
  RenameInputObjectFields,
  RenameObjectFieldArguments,
  RenameObjectFields,
  RenameTypes,
} from '@graphql-tools/wrap';
import { ignoreList } from './shared.js';

export default class WrapRename implements Transform {
  private transforms: Transform[] = [];

  constructor({ config }: { config: YamlConfig.RenameTransform }) {
    for (const change of config.renames) {
      const {
        from: { type: fromTypeName, field: fromFieldName, argument: fromArgumentName },
        to: { type: toTypeName, field: toFieldName, argument: toArgumentName },
        useRegExpForTypes,
        useRegExpForFields,
        useRegExpForArguments,
      } = change;
      const includeDefaults = change.includeDefaults === true;

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
            if (!includeDefaults && ignoreList.includes(typeName)) {
              return typeName;
            }
            return replaceTypeNameFn(typeName);
          }),
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
        this.transforms.push(new RenameObjectFields(replaceFieldNameFn) as any);
        this.transforms.push(new RenameInputObjectFields(replaceFieldNameFn) as any);
      }

      if (
        fromTypeName &&
        (fromTypeName === toTypeName || useRegExpForTypes) &&
        toFieldName &&
        (fromFieldName === toFieldName || useRegExpForFields) &&
        fromArgumentName &&
        fromArgumentName !== toArgumentName
      ) {
        let replaceArgNameFn: (typeName: string, fieldName: string, argName: string) => string;

        const fieldNameMatch = (fieldName: string) =>
          fieldName ===
          (useRegExpForFields
            ? fieldName.replace(new RegExp(fromFieldName, regExpFlags), toFieldName)
            : toFieldName);

        const typeNameMatch = (typeName: string) =>
          typeName ===
          (useRegExpForTypes
            ? typeName.replace(new RegExp(fromTypeName, regExpFlags), toTypeName)
            : toTypeName);

        if (useRegExpForArguments) {
          const argNameRegExp = new RegExp(fromArgumentName, regExpFlags);
          replaceArgNameFn = (typeName, fieldName, argName) =>
            typeNameMatch(typeName) && fieldNameMatch(fieldName)
              ? argName.replace(argNameRegExp, toArgumentName)
              : argName;
        } else {
          replaceArgNameFn = (typeName, fieldName, argName) =>
            typeNameMatch(typeName) && fieldNameMatch(fieldName) && argName === fromArgumentName
              ? toArgumentName
              : argName;
        }

        this.transforms.push(new RenameObjectFieldArguments(replaceArgNameFn) as any);
      }
    }
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema,
  ) {
    return applySchemaTransforms(
      originalWrappingSchema,
      subschemaConfig,
      transformedSchema,
      this.transforms,
    );
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>,
  ) {
    return applyRequestTransforms(
      originalRequest,
      delegationContext,
      transformationContext,
      this.transforms,
    );
  }

  transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: any,
  ) {
    return applyResultTransforms(
      originalResult,
      delegationContext,
      transformationContext,
      this.transforms,
    );
  }
}
