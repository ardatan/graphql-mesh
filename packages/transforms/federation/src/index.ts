import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  isNonNullType,
  GraphQLNonNull,
  isObjectType,
  GraphQLUnionType,
  GraphQLResolveInfo,
} from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions, RawSourceOutput, SyncImportFn } from '@graphql-mesh/types';
import { loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';
import { FederationConfig, FederationFieldsConfig } from 'graphql-transform-federation';
import { addFederationAnnotations } from 'graphql-transform-federation/dist/transform-sdl.js';
import _ from 'lodash';
import { entitiesField, EntityType, serviceField } from '@apollo/federation/dist/types.js';
import { mapSchema, MapperKind, printSchemaWithDirectives } from '@graphql-tools/utils';

export default class FederationTransform implements MeshTransform {
  private apiName: string;
  private config: YamlConfig.Transform['federation'];
  private baseDir: string;
  private syncImportFn: SyncImportFn;

  constructor({ apiName, baseDir, config, syncImportFn }: MeshTransformOptions<YamlConfig.Transform['federation']>) {
    this.apiName = apiName;
    this.config = config;
    this.baseDir = baseDir;
    this.syncImportFn = syncImportFn;
  }

  transformSchema(schema: GraphQLSchema, rawSource: RawSourceOutput) {
    const federationConfig: FederationConfig<any> = {};

    rawSource.merge = {};
    if (this.config?.types) {
      for (const type of this.config.types) {
        rawSource.merge[type.name] = {};
        const fields: FederationFieldsConfig = {};
        if (type.config?.fields) {
          for (const field of type.config.fields) {
            fields[field.name] = field.config;
            rawSource.merge[type.name].fields[field.name] = {};
            if (field.config.requires) {
              rawSource.merge[type.name].fields[field.name].computed = true;
              rawSource.merge[type.name].fields[field.name].selectionSet = `{ ${field.config.requires} }`;
            }
          }
        }
        // If a field is a key field, it should be GraphQLID

        if (type.config?.keyFields) {
          rawSource.merge[type.name].selectionSet = `{ ${type.config.keyFields.join(' ')} }`;
          for (const fieldName of type.config.keyFields) {
            const objectType = schema.getType(type.name) as GraphQLObjectType;
            if (objectType) {
              const existingType = objectType.getFields()[fieldName].type;
              objectType.getFields()[fieldName].type = isNonNullType(existingType)
                ? GraphQLNonNull(GraphQLID)
                : GraphQLID;
            }
          }
        }

        let resolveReference: any;
        if (type.config?.resolveReference) {
          const resolveReferenceConfig = type.config.resolveReference;
          if (typeof resolveReferenceConfig === 'string') {
            const resolveReferenceFn = loadFromModuleExportExpressionSync<any>(resolveReferenceConfig, {
              cwd: this.baseDir,
              syncImportFn: this.syncImportFn,
              defaultExportName: 'default',
            });
            resolveReference = resolveReferenceFn;
          } else if (typeof resolveReferenceConfig === 'function') {
            resolveReference = type.config.resolveReference;
          } else {
            const { queryFieldName, keyArg = schema.getQueryType().getFields()[queryFieldName].args[0].name } =
              resolveReferenceConfig;
            const keyField = type.config.keyFields[0];
            resolveReference = async (root: any, context: any, info: GraphQLResolveInfo) => {
              const result = await context[this.apiName].Query[queryFieldName]({
                root,
                key: keyField,
                argsFromKeys: (keys: string[]) => ({
                  [keyArg]: keys,
                }),
                args: {
                  [keyArg]: root[keyField],
                },
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
        federationConfig[type.name] = {
          ...type.config,
          resolveReference,
          fields,
        };
      }
    }

    const entityTypes = Object.fromEntries(
      Object.entries(federationConfig)
        .filter(([, { keyFields }]) => keyFields?.length)
        .map(([objectName]) => {
          const type = schema.getType(objectName);
          if (!isObjectType(type)) {
            throw new Error(`Type "${objectName}" is not an object type and can't have a key directive`);
          }
          return [objectName, type];
        })
    );

    const hasEntities = !!Object.keys(entityTypes).length;

    const sdlWithFederationDirectives = addFederationAnnotations(printSchemaWithDirectives(schema), federationConfig);

    const schemaWithFederationQueryType = mapSchema(schema, {
      [MapperKind.QUERY]: type => {
        const config = type.toConfig();
        return new GraphQLObjectType({
          ...config,
          fields: {
            ...config.fields,
            ...(hasEntities && {
              _entities: entitiesField,
              _service: {
                ...serviceField,
                resolve: () => ({ sdl: sdlWithFederationDirectives }),
              },
            }),
          },
        });
      },
    });

    const schemaWithUnionType = mapSchema(schemaWithFederationQueryType, {
      [MapperKind.UNION_TYPE]: type => {
        if (type.name === EntityType.name) {
          return new GraphQLUnionType({
            ...EntityType.toConfig(),
            types: Object.values(entityTypes),
          });
        }
        return type;
      },
    });

    // Not using transformSchema since it will remove resolveReference
    Object.entries(federationConfig).forEach(([objectName, currentFederationConfig]) => {
      if (currentFederationConfig.resolveReference) {
        const type = schemaWithUnionType.getType(objectName);
        if (!isObjectType(type)) {
          throw new Error(`Type "${objectName}" is not an object type and can't have a resolveReference function`);
        }
        type.resolveReference = currentFederationConfig.resolveReference;
      }
    });

    return schemaWithUnionType;
  }
}
