import { MeshMerger, MeshMergerContext, MeshTransform } from '@graphql-mesh/types';
import { wrapSchema } from '@graphql-tools/wrap';
import { groupTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { mergeSchemas } from '@graphql-tools/schema';

export default class BareMerger implements MeshMerger {
  name = 'bare';
  async getUnifiedSchema({ rawSources, typeDefs, resolvers, transforms }: MeshMergerContext) {
    const sourceMap = new Map();
    const schemas = rawSources.map(source => {
      let schema = source.schema;

      if (source.executor || source.transforms.length) {
        schema = wrapSchema({
          ...source,
          schema,
          transforms: source.transforms,
          batch: true,
        });
      }
      sourceMap.set(source, schema);
      return schema;
    });

    let schema = mergeSchemas({
      schemas,
      typeDefs,
      resolvers,
    });

    let wrapTransforms: MeshTransform[] = [];
    let noWrapTransforms: MeshTransform[] = [];

    if (transforms?.length) {
      const transformGroups = groupTransforms(transforms);
      wrapTransforms = transformGroups.wrapTransforms;
      noWrapTransforms = transformGroups.noWrapTransforms;
    }

    if (wrapTransforms.length) {
      schema = wrapSchema({
        schema,
        transforms: [...wrapTransforms, ...noWrapTransforms],
        batch: true,
      });
    } else if (noWrapTransforms.length) {
      schema = applySchemaTransforms(schema, undefined, schema, noWrapTransforms);
    }

    schema.extensions = schema.extensions || {};
    Object.defineProperty(schema.extensions, 'sourceMap', {
      get: () => sourceMap,
    });
    return schema;
  }
}
