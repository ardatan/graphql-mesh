import { extendSchema, GraphQLFieldConfig, GraphQLFieldResolver, GraphQLObjectType, GraphQLSchema } from 'graphql';
import { MeshTransform, MeshTransformOptions, SyncImportFn, YamlConfig } from '@graphql-mesh/types';
import { MapperKind, mapSchema, selectObjectFields, pruneSchema } from '@graphql-tools/utils';
import { loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';
import { loadTypedefsSync } from '@graphql-tools/load';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';

type ReplaceFieldConfig = YamlConfig.ReplaceFieldConfig &
  Pick<YamlConfig.ReplaceFieldTransformObject, 'scope' | 'composer'>;

// Execute original field resolver and return single property to be hoisted from rsesolver reponse
const defaultHoistComposer =
  (next: GraphQLFieldResolver<any, any, any>, targetFieldName: string) =>
  async (root: any, args: any, context: any, info: any) => {
    const rawResult = await next(root, args, context, info);
    return rawResult[targetFieldName];
  };
const defaultHoistResolver = (fieldName: string, targetFieldName: string) => (root: any) =>
  root[fieldName] && root[fieldName][targetFieldName];

export default class BareReplaceField implements MeshTransform {
  noWrap = true;
  private baseDir: string;
  private typeDefs: any;
  private replacementsMap: Map<string, ReplaceFieldConfig>;
  private syncImportFn: SyncImportFn;

  constructor(options: MeshTransformOptions<YamlConfig.ReplaceFieldTransform>) {
    const { baseDir, config, syncImportFn } = options;
    this.baseDir = baseDir;
    this.typeDefs = config.typeDefs;
    this.replacementsMap = new Map();
    this.syncImportFn = syncImportFn;

    for (const replacement of config.replacements) {
      const {
        from: { type: fromTypeName, field: fromFieldName },
        to: toConfig,
        scope,
        composer,
      } = replacement;
      const fieldKey = `${fromTypeName}.${fromFieldName}`;

      const composerFn = loadFromModuleExportExpressionSync(composer, {
        cwd: this.baseDir,
        defaultExportName: 'default',
        syncImportFn: this.syncImportFn,
      });

      this.replacementsMap.set(fieldKey, { ...toConfig, scope, composer: composerFn });
    }
  }

  transformSchema(schema: GraphQLSchema) {
    const additionalTypeDefs =
      this.typeDefs &&
      loadTypedefsSync(this.typeDefs, {
        cwd: this.baseDir,
        loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
      });
    const baseSchema = additionalTypeDefs ? extendSchema(schema, additionalTypeDefs[0].document) : schema;

    const transformedSchema = mapSchema(baseSchema, {
      [MapperKind.COMPOSITE_FIELD]: (
        fieldConfig: GraphQLFieldConfig<any, any>,
        fieldName: string,
        typeName: string
      ) => {
        const fieldKey = `${typeName}.${fieldName}`;
        const newFieldConfig = this.replacementsMap.get(fieldKey);
        if (!newFieldConfig) {
          return undefined;
        }

        const targetFieldName = newFieldConfig.field;
        const targetFieldConfig = selectObjectFields(
          baseSchema,
          newFieldConfig.type,
          fieldName => fieldName === targetFieldName
        )[targetFieldName] as unknown as GraphQLFieldConfig<any, any>;

        if (newFieldConfig.scope === 'config') {
          const targetResolver = targetFieldConfig.resolve;
          targetFieldConfig.resolve =
            newFieldConfig.composer && targetResolver ? newFieldConfig.composer(targetResolver) : targetResolver;

          // replace the entire field config
          return [fieldName, targetFieldConfig];
        }

        const originalResolver = fieldConfig.resolve;
        fieldConfig.type = targetFieldConfig.type as unknown as GraphQLObjectType;

        if (newFieldConfig.scope === 'hoistValue') {
          // implement resolver value hoisting by computing a resolver function.

          // if we have a resolver function we wrap it with a default composer that hoists the value from resolver result
          // if we don't have a resolver function we create one that hoists the value from the root object
          const targetResolver = originalResolver
            ? defaultHoistComposer(originalResolver, targetFieldName)
            : defaultHoistResolver(fieldName, targetFieldName);

          // finally if we have a user-defined composer we wrap it around our computed resolver above
          fieldConfig.resolve = newFieldConfig.composer ? newFieldConfig.composer(targetResolver) : targetResolver;
        } else if (newFieldConfig.composer) {
          // if we're noi hosting avalue and we have a user-defined composer
          // we just wrap the original resolver function (if available) with the given composer function
          fieldConfig.resolve = originalResolver && newFieldConfig.composer(originalResolver);
        }

        // avoid re-iterating over replacements that have already been applied
        this.replacementsMap.delete(fieldKey);

        return [fieldName, fieldConfig];
      },
    });

    return pruneSchema(transformedSchema);
  }
}
