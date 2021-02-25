import { GraphQLSchema, GraphQLObjectType, GraphQLID, isNonNullType, GraphQLNonNull } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { loadFromModuleExportExpressionSync } from '@graphql-mesh/utils';
import { transformSchemaFederation, FederationConfig, FederationFieldsConfig } from 'graphql-transform-federation';
import { get, set } from 'lodash';

export default class FederationTransform implements MeshTransform {
  private config: YamlConfig.Transform['federation'];
  private baseDir: string;

  constructor({ baseDir, config }: MeshTransformOptions<YamlConfig.Transform['federation']>) {
    this.config = config;
    this.baseDir = baseDir;
  }

  transformSchema(schema: GraphQLSchema) {
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
            resolveReference = loadFromModuleExportExpressionSync(resolveReferenceConfig, { cwd: this.baseDir });
          } else if (typeof resolveReferenceConfig === 'function') {
            resolveReference = type.config.resolveReference;
          } else {
            const {
              args,
              targetSource,
              targetMethod,
              resultSelectedFields,
              resultSelectionSet,
              resultDepth,
              returnData,
            } = resolveReferenceConfig;
            resolveReference = async (root: any, context: any, info: any) => {
              const resolverData = { root, context, info };
              const methodArgs: any = {};
              for (const argPath in args) {
                set(methodArgs, argPath, get(resolverData, resolveReferenceConfig.args[argPath]));
              }
              const result = await context[targetSource].api[targetMethod](methodArgs, {
                selectedFields: resultSelectedFields,
                selectionSet: resultSelectionSet,
                depth: resultDepth,
              });
              return returnData ? get(result, returnData) : result;
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

    return transformSchemaFederation(schema, federationConfig);
  }
}
