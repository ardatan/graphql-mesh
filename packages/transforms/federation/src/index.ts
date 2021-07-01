import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  isNonNullType,
  GraphQLNonNull,
  isObjectType,
  GraphQLUnionType,
  buildSchema,
  GraphQLResolveInfo,
} from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions, RawSourceOutput } from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { FederationConfig, FederationFieldsConfig } from 'graphql-transform-federation';
import { addFederationAnnotations } from 'graphql-transform-federation/dist/transform-sdl.js';
import _ from 'lodash';
import { entitiesField, EntityType, serviceField } from '@apollo/federation/dist/types.js';
import { mapSchema, MapperKind, printSchemaWithDirectives } from '@graphql-tools/utils';

import federationToStitchingSDL from 'federation-to-stitching-sdl';

import { stitchingDirectives } from '@graphql-tools/stitching-directives';

export default class FederationTransform implements MeshTransform {
  private config: YamlConfig.Transform['federation'];
  private baseDir: string;
  constructor({ baseDir, config }: MeshTransformOptions<YamlConfig.Transform['federation']>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  transformSchema(schema: GraphQLSchema, subschemaConfig: RawSourceOutput) {
    const federationConfig: FederationConfig<any> = {};

    if (this.config?.types) {
      for (const type of this.config.types) {
        const fields: FederationFieldsConfig = {};
        if (type.config?.fields) {
          for (const field of type.config.fields) {
            fields[field.name] = field.config;
          }
        }
        // If a field is a key field, it should be GraphQLID

        if (type.config?.keyFields) {
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
            resolveReference = (...args: any[]) =>
              loadFromModuleExportExpression<any>(resolveReferenceConfig, { cwd: this.baseDir }).then(fn =>
                fn(...args)
              );
          } else if (typeof resolveReferenceConfig === 'function') {
            resolveReference = type.config.resolveReference;
          } else {
            const { queryFieldName, keyArg = schema.getQueryType().getFields()[queryFieldName].args[0].name } =
              resolveReferenceConfig;
            const keyField = type.config.keyFields[0];
            resolveReference = async (root: any, context: any, info: GraphQLResolveInfo) => {
              const result = await context[subschemaConfig.name].Query[queryFieldName]({
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
        .map(([objectName, { keyFields }]) => {
          const type = schema.getType(objectName);
          if (!isObjectType(type)) {
            throw new Error(`Type "${objectName}" is not an object type and can't have a key directive`);
          }
          return [objectName, type];
        })
    );

    const hasEntities = !!Object.keys(entityTypes).length;

    const schemaWithFederationDirectives = addFederationAnnotations(
      printSchemaWithDirectives(schema),
      federationConfig
    );

    const { stitchingDirectivesTransformer } = stitchingDirectives();
    const sdlWithStitchingDirectives = federationToStitchingSDL(schemaWithFederationDirectives);

    subschemaConfig.merge = stitchingDirectivesTransformer({
      schema: buildSchema(sdlWithStitchingDirectives, {
        assumeValid: true,
        assumeValidSDL: true,
      }),
    }).merge;

    const schemaWithFederationQueryType = mapSchema(schema, {
      [MapperKind.QUERY]: type => {
        const config = type.toConfig();
        return new GraphQLObjectType({
          ...config,
          fields: {
            ...config.fields,
            ...(hasEntities && {
              _entities: {
                ...entitiesField,
                resolve: async (_source, { representations }, context, info) => {
                  return representations.map(async (reference: any) => {
                    const { __typename } = reference;
                    const type = entityTypes[__typename];
                    if (!type || !isObjectType(type)) {
                      throw new Error(
                        `The _entities resolver tried to load an entity for type "${__typename}", but no object type of that name was found in the schema`
                      );
                    }
                    const resolveReference = type.resolveReference
                      ? type.resolveReference
                      : function defaultResolveReference() {
                          return reference;
                        };
                    const result = await resolveReference(reference, context, info);
                    return {
                      __typename,
                      ...result,
                    };
                  });
                },
              },
              _service: {
                ...serviceField,
                resolve: () => ({ sdl: schemaWithFederationDirectives }),
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
        const type = schema.getType(objectName);
        if (!isObjectType(type)) {
          throw new Error(`Type "${objectName}" is not an object type and can't have a resolveReference function`);
        }
        type.resolveReference = currentFederationConfig.resolveReference;
      }
    });

    schemaWithUnionType.extensions = schemaWithUnionType.extensions || {};
    Object.assign(schemaWithUnionType.extensions, {
      apolloServiceSdl: schemaWithFederationDirectives,
    });

    return schemaWithUnionType;
  }
}
