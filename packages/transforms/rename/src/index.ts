import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { RenameTypes, RenameObjectFields, RenameRootFields, RenameRootTypes } from '@graphql-tools/wrap';
import {
  applySchemaTransforms,
  applyRequestTransforms,
  Request,
  applyResultTransforms,
  Result,
  Transform,
} from '@graphql-tools/utils';

export default class RenameTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.RenameTransformObject[]>) {
    const { config } = options;
    for (const change of config) {
      const [fromTypeName, fromFieldName] = change.from.split('.');
      const [toTypeName, toFieldName] = change.to.split('.');

      if (fromTypeName !== toTypeName) {
        this.transforms.push(new RenameRootTypes(t => (t === fromTypeName ? toTypeName : t)));
        this.transforms.push(new RenameTypes(t => (t === fromTypeName ? toTypeName : t)));
      }

      if (fromFieldName && toFieldName && fromFieldName !== toFieldName) {
        this.transforms.push(
          new RenameRootFields((typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName
          )
        );
        this.transforms.push(
          new RenameObjectFields((typeName, fieldName) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName
          )
        );
      }
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
