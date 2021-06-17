import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  isNonNullType,
  GraphQLNonNull,
  isObjectType,
  GraphQLUnionType,
} from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { loadFromModuleExportExpression, stringInterpolator } from '@graphql-mesh/utils';
import { FederationConfig, FederationFieldsConfig } from 'graphql-transform-federation';
import { addFederationAnnotations } from 'graphql-transform-federation/dist/transform-sdl.js';
import _ from 'lodash';
import { entitiesField, EntityType, serviceField } from '@apollo/federation/dist/types.js';
import { mapSchema, MapperKind, printSchemaWithDirectives } from '@graphql-tools/utils';
import { SubschemaConfig } from '@graphql-tools/delegate';

import federationToStitchingSDL from 'federation-to-stitching-sdl';

import { mergeSchemas } from '@graphql-tools/merge';

export default class FederationTransform implements MeshTransform {
  private config: YamlConfig.Transform['federation'];
  private baseDir: string;

  constructor({ baseDir, config }: MeshTransformOptions<YamlConfig.Transform['federation']>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  transformSchema(schema: GraphQLSchema, subschemaConfig: SubschemaConfig) {
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
            const { sourceName, sourceTypeName, sourceFieldName, sourceSelectionSet, sourceArgs, returnData } =
              resolveReferenceConfig;
            resolveReference = async (root: any, context: any, info: any) => {
              const resolverData = { root, context, info };
              const methodArgs: any = {};
              for (const argPath in sourceArgs) {
                _.set(
                  methodArgs,
                  argPath,
                  stringInterpolator.parse(resolveReferenceConfig.sourceArgs[argPath], resolverData)
                );
              }
              const result = await context[sourceName][sourceTypeName][sourceFieldName]({
                root,
                args: methodArgs,
                context,
                info,
                selectionSet: sourceSelectionSet,
              });
              return returnData ? _.get(result, returnData) : result;
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
        .filter(([, { keyFields }]) => keyFields && keyFields.length)
        .map(([objectName]) => {
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

    const sdlWithStitchingDirectives = federationToStitchingSDL(schemaWithFederationDirectives);

    const schemaWithStitchingDirectives = mergeSchemas({ schemas: [schema], typeDefs: [sdlWithStitchingDirectives] });

    const schemaWithFederationQueryType = mapSchema(schemaWithStitchingDirectives, {
      [MapperKind.QUERY]: type => {
        const config = type.toConfig();
        return new GraphQLObjectType({
          ...config,
          fields: {
            ...config.fields,
            ...(hasEntities && { _entities: entitiesField }),
            _service: {
              ...serviceField,
              resolve: () => ({ sdl: schemaWithFederationDirectives }),
            },
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

    schemaWithUnionType.extensions = schemaWithUnionType.extensions || {};
    Object.assign(schemaWithUnionType.extensions, {
      apolloServiceSdl: schemaWithFederationDirectives,
    });

    return schemaWithUnionType;
  }
}
