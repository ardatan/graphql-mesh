import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { RenameTypes, RenameRootFields } from '@graphql-tools/wrap';
import {
  applySchemaTransforms,
  applyRequestTransforms,
  Request,
  applyResultTransforms,
  Result,
  Transform,
} from '@graphql-tools/utils';

export default class PrefixTransform implements MeshTransform {
  private transforms: Transform[] = [];
  constructor(options: MeshTransformOptions<YamlConfig.PrefixTransformConfig>) {
    const { apiName, config } = options;
    let prefix: string | null = null;

    if (config.value) {
      prefix = config.value;
    } else if (apiName) {
      prefix = `${apiName}_`;
    }

    if (!prefix) {
      throw new Error(`Transform 'prefix' has missing config: prefix`);
    }

    const ignoreList = config.ignore || [];

    this.transforms.push(
      new RenameTypes(typeName => (ignoreList.includes(typeName) ? typeName : `${prefix}${typeName}`))
    );

    if (config.includeRootOperations) {
      this.transforms.push(
        new RenameRootFields((typeName, fieldName) =>
          ignoreList.includes(typeName) || ignoreList.includes(`${typeName}.${fieldName}`)
            ? fieldName
            : `${prefix}${fieldName}`
        )
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
