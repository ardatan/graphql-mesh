import { extendSchema, defaultFieldResolver, GraphQLFieldConfig, GraphQLFieldResolver, GraphQLSchema } from 'graphql';
import { MeshTransform, MeshTransformOptions, SyncImportFn, YamlConfig } from '@graphql-mesh/types';
import { loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefsSync } from '@graphql-tools/load';
import { MapperKind, mapSchema, selectObjectFields, pruneSchema } from '@graphql-tools/utils';

type ReplaceFieldConfig = YamlConfig.ReplaceFieldConfig &
  Pick<YamlConfig.ReplaceFieldTransformObject, 'scope' | 'composer'>;

// Execute original field resolver and return single property to be hoisted from rsesolver reponse
const defaultHoistFieldComposer =
  (next: GraphQLFieldResolver<any, any, any>, targetFieldName: string) =>
  async (root: any, args: any, context: any, info: any) => {
    const rawResult = await next(root, args, context, info);
    return rawResult && rawResult[targetFieldName];
  };

export default class ReplaceFieldTransform implements MeshTransform {
  noWrap = true;
  private baseDir: string;
  private typeDefs: Pick<YamlConfig.ReplaceFieldTransformConfig, 'typeDefs'>;
  private replacementsMap: Map<string, ReplaceFieldConfig>;
  private syncImportFn: SyncImportFn;

  constructor(options: MeshTransformOptions<YamlConfig.ReplaceFieldTransformConfig>) {
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
        )[targetFieldName];

        if (newFieldConfig.scope === 'config') {
          const targetResolver = targetFieldConfig.resolve;
          targetFieldConfig.resolve =
            newFieldConfig.composer && targetResolver ? newFieldConfig.composer(targetResolver) : targetResolver;

          // replace the entire field config
          return [fieldName, targetFieldConfig];
        }

        // override field type with the target type requested
        fieldConfig.type = targetFieldConfig.type;

        if (newFieldConfig.scope === 'hoistValue') {
          // implement value hoisting by wrapping a default composer that hoists the value from resolver result
          fieldConfig.resolve = defaultHoistFieldComposer(fieldConfig.resolve || defaultFieldResolver, targetFieldName);
        }

        if (newFieldConfig.composer) {
          // wrap user-defined composer to current field resolver or, if not preset, defaultFieldResolver
          fieldConfig.resolve = newFieldConfig.composer(fieldConfig.resolve || defaultFieldResolver);
        }

        // avoid re-iterating over replacements that have already been applied
        this.replacementsMap.delete(fieldKey);

        return [fieldName, fieldConfig];
      },
    });

    return pruneSchema(transformedSchema);
  }
}
