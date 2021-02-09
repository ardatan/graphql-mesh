import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { IResolvers, renameType, MapperKind, mapSchema } from '@graphql-tools/utils';
import { mergeSchemas } from '@graphql-tools/merge';

export default class RenameBareTransform implements MeshTransform {
  noWrap = true;
  typesMap: Map<string, string>;
  fieldsMap: Map<string, { [name: string]: string }>;

  constructor(options: MeshTransformOptions<YamlConfig.RenameBareTransformObject[]>) {
    const { config } = options;
    this.typesMap = new Map();
    this.fieldsMap = new Map();

    for (const rename of config) {
      const {
        from: { type: fromTypeName, field: fromFieldName },
        to: { type: toTypeName, field: toFieldName },
      } = rename;
      if (fromTypeName && !fromFieldName && toTypeName && !toFieldName && fromTypeName !== toTypeName) {
        this.typesMap.set(fromTypeName, toTypeName);
      }
      if (fromTypeName && fromFieldName && toTypeName && toFieldName && fromFieldName !== toFieldName) {
        const entry = { [fromFieldName]: toFieldName };
        this.fieldsMap.set(
          fromTypeName,
          this.fieldsMap.has(fromTypeName) ? { ...this.fieldsMap.get(fromTypeName), ...entry } : entry
        );
      }
    }
  }

  renameType(type: any) {
    const newTypeName = this.typesMap.get(type.toString());

    if (newTypeName) {
      return renameType(type, newTypeName);
    }
  }

  transformSchema(schema: GraphQLSchema) {
    const renamedSchema = mapSchema(schema, {
      [MapperKind.TYPE]: type => this.renameType(type),
      [MapperKind.ROOT_OBJECT]: type => this.renameType(type),
      [MapperKind.COMPOSITE_FIELD]: (
        fieldConfig: GraphQLFieldConfig<any, any>,
        fieldName: string,
        typeName: string
      ) => {
        const newFieldName = this.fieldsMap.has(typeName) && this.fieldsMap.get(typeName)[fieldName];

        if (newFieldName) {
          return [newFieldName, fieldConfig];
        }
      },
    });

    // Root fields always have a default resolver and so don't need mapping
    this.fieldsMap.delete('Query');
    this.fieldsMap.delete('Mutation');
    this.fieldsMap.delete('Subscription');

    const resolvers: IResolvers | IResolvers[] = [];

    if (this.fieldsMap.size) {
      for (const [type, fields] of this.fieldsMap.entries()) {
        const typeName = this.typesMap.get(type) || type;
        const typeResolvers = Object.entries(fields).reduce((fieldResolvers, [oldName, newName]) => {
          fieldResolvers[newName] = (object: any) => object[oldName];
          return fieldResolvers;
        }, {});
        resolvers.push({ [typeName]: typeResolvers });
      }
    }

    return resolvers.length
      ? mergeSchemas({
          schemas: [renamedSchema],
          resolvers,
        })
      : renamedSchema;
  }
}
