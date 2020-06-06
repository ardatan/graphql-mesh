import { matcher } from 'micromatch';

import { GraphQLSchema } from 'graphql';
import { Transform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { FilterRootFields, FilterObjectFields } from '@graphql-tools/wrap';
import {
  applySchemaTransforms,
  applyRequestTransforms,
  applyResultTransforms,
  Request,
  Result,
} from '@graphql-tools/utils';

export default class FilterTransform implements Transform {
  private transforms: Transform[] = [];
  constructor(options: MeshTransformOptions<YamlConfig.Transform['filterSchema']>) {
    const { config } = options;
    for (const filter of config) {
      const [typeName, fieldGlob] = filter.split('.');
      const isMatch = matcher(fieldGlob.trim());
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
