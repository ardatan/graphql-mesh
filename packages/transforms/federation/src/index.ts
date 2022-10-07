import { GraphQLSchema, GraphQLObjectType, GraphQLUnionType } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions, ImportFn } from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { entitiesField, EntityType, serviceField } from '@apollo/subgraph/dist/types.js';
import { mapSchema, MapperKind, printSchemaWithDirectives } from '@graphql-tools/utils';
import { MergedTypeResolver, SubschemaConfig } from '@graphql-tools/delegate';
import set from 'lodash.set';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';

export default class FederationTransform implements MeshTransform {
  private apiName: string;
  private config: YamlConfig.Transform['federation'];
  private baseDir: string;
  private importFn: ImportFn;

  constructor({ apiName, baseDir, config, importFn }: MeshTransformOptions<YamlConfig.Transform['federation']>) {
    this.apiName = apiName;
    this.config = config;
    this.baseDir = baseDir;
    this.importFn = importFn;
  }

  transformSchema(schema: GraphQLSchema, rawSource: SubschemaConfig) {
    rawSource.merge = {};
    if (this.config?.types) {
      const queryType = schema.getQueryType();
      const queryTypeFields = queryType.getFields();
      for (const type of this.config.types) {
        rawSource.merge[type.name] = {};
        const typeObj = schema.getType(type.name) as GraphQLObjectType;
        typeObj.extensions = typeObj.extensions || {};
        const typeDirectivesObj: any = ((typeObj.extensions as any).directives = typeObj.extensions.directives || {});
        typeDirectivesObj.key = type.config?.key;
        typeDirectivesObj.shareable = type.config?.shareable;
        const typeFieldObjs = typeObj.getFields();
        if (type.config?.fields) {
          for (const field of type.config.fields) {
            const typeField = typeFieldObjs[field.name];
            if (typeField) {
              typeField.extensions = typeField.extensions || {};
              const directivesObj: any = ((typeField.extensions as any).directives =
                typeField.extensions.directives || {});
              Object.assign(directivesObj, field.config);
            }
            rawSource.merge[type.name].fields = rawSource.merge[type.name].fields || {};
            rawSource.merge[type.name].fields[field.name] = rawSource.merge[type.name].fields[field.name] || {};
            if (field.config.requires) {
              rawSource.merge[type.name].fields[field.name].computed = true;
              rawSource.merge[type.name].fields[field.name].selectionSet = `{ ${field.config.requires} }`;
            }
          }
        }
        // If a field is a key field, it should be GraphQLID

        if (type.config?.key) {
          let selectionSetContent = '';
          for (const keyField of type.config.key) {
            selectionSetContent += '\n';
            selectionSetContent += keyField.fields || '';
          }
          if (selectionSetContent) {
            rawSource.merge[type.name].selectionSet = `{ ${selectionSetContent} }`;
          }
        }

        let resolveReference: MergedTypeResolver<any>;
        if (type.config?.resolveReference) {
          const resolveReferenceConfig = type.config.resolveReference;
          if (typeof resolveReferenceConfig === 'string') {
            const fn$ = loadFromModuleExportExpression<any>(resolveReferenceConfig, {
              cwd: this.baseDir,
              defaultExportName: 'default',
              importFn: this.importFn,
            });
            resolveReference = (...args: any[]) => fn$.then(fn => fn(...args));
          } else if (typeof resolveReferenceConfig === 'function') {
            resolveReference = resolveReferenceConfig;
          } else {
            const queryField = queryTypeFields[resolveReferenceConfig.queryFieldName];
            resolveReference = async (root, context, info) => {
              const args = {};
              for (const argName in resolveReferenceConfig.args) {
                const argVal = stringInterpolator.parse(resolveReferenceConfig.args[argName], {
                  root,
                  args,
                  context,
                  info,
                  env: process.env,
                });
                set(args, argName, argVal);
              }
              const result = await context[this.apiName].Query[queryField.name]({
                root,
                args,
                context,
                info,
              });
              return {
                ...root,
                ...result,
              };
            };
          }
          rawSource.merge[type.name].resolve = resolveReference;
        }
      }
    }

    const sdlWithFederationDirectives = printSchemaWithDirectives(schema);

    const schemaWithFederationQueryType = mapSchema(schema, {
      [MapperKind.QUERY]: type => {
        const config = type.toConfig();
        return new GraphQLObjectType({
          ...config,
          fields: {
            ...config.fields,
            _entities: entitiesField,
            _service: {
              ...serviceField,
              resolve: () => ({ sdl: sdlWithFederationDirectives }),
            },
          },
        });
      },
    });

    const entityTypes = (this.config?.types.map(type => schema.getType(type.name)) as GraphQLObjectType[]) || [];

    const schemaWithUnionType = mapSchema(schemaWithFederationQueryType, {
      [MapperKind.UNION_TYPE]: type => {
        if (type.name === EntityType.name) {
          return new GraphQLUnionType({
            ...EntityType.toConfig(),
            types: entityTypes,
          });
        }
        return type;
      },
    });

    this.config?.types.forEach(typeConfig => {
      const type = schemaWithUnionType.getType(typeConfig.name) as GraphQLObjectType;
      (type as any).resolveObject = rawSource.merge[typeConfig.name].resolve;
    });

    return schemaWithUnionType;
  }
}
