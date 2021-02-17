import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { ExecutionResult, pruneSchema, Request } from '@graphql-tools/utils';
import { FilterInputObjectFields, FilterTypes } from '@graphql-tools/wrap';
import { GraphQLSchema } from 'graphql';
import { matcher } from 'micromatch';

import FilterObjectFieldsAndArguments from './FilterObjectFieldsAndArguments';
import { FilterRootFieldsAndArguments } from './FilterRootFieldsAndArguments';

export default class WrapFilter implements MeshTransform {
  private transforms: Transform[] = [];
  constructor(options: MeshTransformOptions<YamlConfig.FilterSchemaTransform>) {
    const {
      config: { filters },
    } = options;
    for (const filter of filters) {
      const [typeName, fieldGlob] = filter.split('.');
      const isTypeMatch = matcher(typeName);
      if (!fieldGlob) {
        this.transforms.push(
          new FilterTypes(type => {
            return isTypeMatch(type.name);
          })
        );
      } else {
        // returns a match where second match = '{' or '!{' and third match being the content of the array
        const outerArrayMatch = fieldGlob.match(/^(\{|!{)(.*)(?=\}$)/);
        const fieldGlobStripped = outerArrayMatch ? outerArrayMatch[2] : fieldGlob;

        // split field parts (might include argument filter)
        const fieldPatterns = fieldGlobStripped.match(/[\w-!*?[\]]+(\(.*?\))?/g);

        // extract field names only
        let fixedFieldGlob = fieldPatterns.map(i => i.split('(')[0].trim()).join(',');

        // if input was glob glob array
        if (outerArrayMatch) {
          // strip array for single field inputs
          if (fieldPatterns.length === 1) {
            fixedFieldGlob = `${outerArrayMatch[1].replace('{', '')}${fixedFieldGlob}`;
          } else {
            fixedFieldGlob = `${outerArrayMatch[1]}${fixedFieldGlob}}`;
          }
        }

        const fieldArgsPatternMap = fieldPatterns.reduce((prev, match) => {
          const fieldParts = match.split('(');

          if (fieldParts.length !== 2) {
            return prev;
          }

          const fieldName = fieldParts[0].replace(/!{|{|}/g, '').trim();
          const fixedArgGlob = fieldParts[1]
            .split(')')[0]
            .split(',')
            .map(i => i.trim())
            .join(',');

          prev[fieldName] = fixedArgGlob;
          return prev;
        }, {});

        const isMatch = matcher(fixedFieldGlob.trim());
        this.transforms.push(
          new FilterRootFieldsAndArguments(
            (rootTypeName, rootFieldName) => {
              if (isTypeMatch(rootTypeName)) {
                return isMatch(rootFieldName);
              }
              return true;
            },
            (fieldName, argName) => {
              if (!fieldArgsPatternMap[fieldName]) {
                return true;
              }
              return matcher(fieldArgsPatternMap[fieldName])(argName);
            }
          )
        );

        this.transforms.push(
          new FilterObjectFieldsAndArguments(
            (rootTypeName, rootFieldName) => {
              if (isTypeMatch(rootTypeName)) {
                return isMatch(rootFieldName);
              }
              return true;
            },
            (fieldName, argName) => {
              if (!fieldArgsPatternMap[fieldName]) {
                return true;
              }
              return matcher(fieldArgsPatternMap[fieldName])(argName);
            }
          )
        );

        this.transforms.push(
          new FilterInputObjectFields((inputObjectTypeName, inputObjectFieldName) => {
            if (isTypeMatch(inputObjectTypeName)) {
              return isMatch(inputObjectFieldName);
            }
            return true;
          })
        );
      }
    }
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ) {
    const returnedSchema = applySchemaTransforms(
      originalWrappingSchema,
      subschemaConfig,
      transformedSchema,
      this.transforms
    );
    // TODO: Need a better solution
    return pruneSchema(returnedSchema, {
      skipEmptyCompositeTypePruning: false,
      skipEmptyUnionPruning: true,
      skipUnimplementedInterfacesPruning: true,
      skipUnusedTypesPruning: true,
    });
  }

  transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ) {
    return applyRequestTransforms(originalRequest, delegationContext, transformationContext, this.transforms);
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    return applyResultTransforms(originalResult, delegationContext, transformationContext, this.transforms);
  }
}
