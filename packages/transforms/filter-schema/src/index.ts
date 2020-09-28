import { matcher } from 'micromatch';

import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { FilterRootFields, FilterObjectFields, FilterInputObjectFields } from '@graphql-tools/wrap';
import {
  applySchemaTransforms,
  applyRequestTransforms,
  applyResultTransforms,
  Request,
  Result,
  Transform,
} from '@graphql-tools/utils';

export default class FilterTransform implements MeshTransform {
  private transforms: Transform[] = [];
  constructor(options: MeshTransformOptions<YamlConfig.Transform['filterSchema']>) {
    const { config } = options;
    for (const filter of config) {
      const [typeName, fieldGlob] = filter.split('.');
      let fixedFieldGlob = fieldGlob;
      if (fixedFieldGlob.includes('{') && !fixedFieldGlob.includes(',')) {
        fixedFieldGlob = fieldGlob.replace('{', '').replace('}', '');
      }
      const isMatch = matcher(fixedFieldGlob.trim());
      this.transforms.push(
        new FilterRootFields((rootTypeName, rootFieldName) => {
          if (rootTypeName === typeName) {
            return isMatch(rootFieldName);
          }
          return true;
        })
      );
      this.transforms.push(
        new FilterObjectFields((objectTypeName, objectFieldName) => {
          if (objectTypeName === typeName) {
            return isMatch(objectFieldName);
          }
          return true;
        })
      );
      this.transforms.push(
        new FilterInputObjectFields((inputObjectTypeName, inputObjectFieldName) => {
          if (inputObjectTypeName === typeName) {
            return isMatch(inputObjectFieldName);
          }
          return true;
        })
      );
    }
  }

  transformSchema(schema: GraphQLSchema) {
    return applySchemaTransforms(schema, this.transforms);
  }

  transformRequest(request: Request) {
    return applyRequestTransforms(request, this.transforms);
  }

  transformResult(result: Result) {
    return applyResultTransforms(result, this.transforms);
  }
}
