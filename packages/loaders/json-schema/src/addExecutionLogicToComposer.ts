import type { GraphQLScalarType } from 'graphql';
import {
  getNamedType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  isInterfaceType,
} from 'graphql';
import type {
  InterfaceTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfig,
  SchemaComposer,
} from 'graphql-compose';
import { GraphQLJSON } from 'graphql-compose';
import type { IStringifyOptions } from 'qs';
import { process } from '@graphql-mesh/cross-helpers';
import type { Logger } from '@graphql-mesh/types';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  HTTPOperationDirective,
  LinkResolverDirective,
  OasLinkDirective,
  PubSubOperationDirective,
  ResolveRootDirective,
  ResponseMetadataDirective,
  TransportDirective,
} from './directives.js';
import type {
  JSONSchemaLinkConfig,
  JSONSchemaOperationConfig,
  OperationHeadersConfiguration,
} from './types.js';
import { getOperationMetadata, isPubSubOperationConfig } from './utils.js';

export interface AddExecutionLogicToComposerOptions {
  schemaComposer: SchemaComposer;
  endpoint: string;
  operations: JSONSchemaOperationConfig[];
  operationHeaders?: OperationHeadersConfiguration;
  logger: Logger;
  queryParams?: Record<string, string | number | boolean>;
  queryStringOptions?: IStringifyOptions;
  getScalarForFormat?: (format: string) => GraphQLScalarType | void;
  handlerName?: string;
}

const responseMetadataType = new GraphQLObjectType({
  name: 'ResponseMetadata',
  fields: {
    url: { type: GraphQLString },
    method: { type: GraphQLString },
    status: { type: GraphQLInt },
    statusText: { type: GraphQLString },
    headers: { type: GraphQLJSON },
    body: { type: GraphQLJSON },
  },
});

export function addExecutionDirectivesToComposer(
  subgraphName: string,
  {
    schemaComposer,
    logger,
    operations,
    operationHeaders,
    endpoint,
    queryParams,
    queryStringOptions,
    handlerName,
  }: AddExecutionLogicToComposerOptions,
) {
  logger.debug(`Attaching execution directives to the schema`);
  for (const operationConfig of operations) {
    const { httpMethod, rootTypeName, fieldName } = getOperationMetadata(operationConfig);

    const rootTypeComposer = schemaComposer[rootTypeName];

    const field = rootTypeComposer.getField(fieldName);

    if (isPubSubOperationConfig(operationConfig)) {
      field.description =
        operationConfig.description || `PubSub Topic: ${operationConfig.pubsubTopic}`;
      field.directives = field.directives || [];
      schemaComposer.addDirective(PubSubOperationDirective);
      field.directives.push({
        name: 'pubsubOperation',
        args: {
          subgraph: subgraphName,
          pubsubTopic: operationConfig.pubsubTopic,
        },
      });
    } else if (operationConfig.path) {
      if (process.env.DEBUG === '1' || process.env.DEBUG === 'fieldDetails') {
        field.description = `
>**Method**: \`${operationConfig.method}\`
>**Base URL**: \`${endpoint}\`
>**Path**: \`${operationConfig.path}\`
${operationConfig.description || ''}
`;
      } else {
        field.description = operationConfig.description;
      }

      field.directives = field.directives || [];
      schemaComposer.addDirective(HTTPOperationDirective);
      field.directives.push({
        name: 'httpOperation',
        args: JSON.parse(
          JSON.stringify({
            subgraph: subgraphName,
            path: operationConfig.path,
            operationSpecificHeaders: operationConfig.headers
              ? Object.entries(operationConfig.headers)
              : undefined,
            httpMethod,
            isBinary: 'binary' in operationConfig ? operationConfig.binary : undefined,
            requestBaseBody:
              'requestBaseBody' in operationConfig ? operationConfig.requestBaseBody : undefined,
            queryParamArgMap: operationConfig.queryParamArgMap,
            queryStringOptionsByParam: operationConfig.queryStringOptionsByParam,
            jsonApiFields: operationConfig.jsonApiFields,
            queryStringOptions:
              'queryStringOptions' in operationConfig
                ? operationConfig.queryStringOptions
                : undefined,
          }),
        ),
      });

      const handleLinkMap = (
        linkMap: Record<string, JSONSchemaLinkConfig>,
        typeTC: ObjectTypeComposer | InterfaceTypeComposer,
      ) => {
        for (const linkName in linkMap) {
          const linkObj = linkMap[linkName];
          field.directives = field.directives || [];
          let linkResolverMapDirective = field.directives.find(d => d.name === 'linkResolver');
          if (!linkResolverMapDirective) {
            schemaComposer.addDirective(LinkResolverDirective);
            linkResolverMapDirective = {
              name: 'linkResolver',
              args: {
                subgraph: subgraphName,
                linkResolverMap: {},
              },
            };
            field.directives.push(linkResolverMapDirective);
          }
          const linkResolverFieldMap = linkResolverMapDirective.args.linkResolverMap;
          let targetField: ObjectTypeComposerFieldConfig<any, any> | undefined;
          let fieldTypeName: string;
          try {
            targetField = schemaComposer.Query.getField(linkObj.fieldName);
            fieldTypeName = 'Query';
          } catch {
            try {
              targetField = schemaComposer.Mutation.getField(linkObj.fieldName);
              fieldTypeName = 'Mutation';
            } catch {}
          }
          if (!targetField) {
            logger.debug(
              `Field ${linkObj.fieldName} not found in ${subgraphName} for link ${linkName}`,
            );
          }
          linkResolverFieldMap[linkName] = {
            linkObjArgs: linkObj.args,
            targetTypeName: fieldTypeName,
            targetFieldName: linkObj.fieldName,
          };
          schemaComposer.addDirective(OasLinkDirective);
          const fields = {
            [linkName]: {
              ...targetField,
              directives: [
                {
                  name: 'oas_link',
                  args: {
                    subgraph: subgraphName,
                    defaultRootType: rootTypeName,
                    defaultField: operationConfig.field,
                  },
                },
              ],
              get args() {
                return linkObj.args ? {} : targetField?.args;
              },
              get description() {
                return linkObj.description || targetField?.description;
              },
            },
          };
          typeTC.addFields(fields);
          if (schemaComposer.isInterfaceType(typeTC)) {
            const iFaceTC = typeTC as InterfaceTypeComposer;
            for (const subTC of schemaComposer.types.values()) {
              if ('getInterfaces' in subTC) {
                if (
                  subTC.getInterfaces().some(iFace => iFace.getTypeName() === iFaceTC.getTypeName())
                ) {
                  subTC.addFields(fields);
                }
              }
            }
          }
        }
      };

      if ('links' in operationConfig) {
        const typeTC = schemaComposer.getAnyTC(field.type.getTypeName());
        handleLinkMap(operationConfig.links, typeTC as ObjectTypeComposer);
      }

      if ('exposeResponseMetadata' in operationConfig && operationConfig.exposeResponseMetadata) {
        const typeTC = schemaComposer.getOTC(field.type.getTypeName());
        schemaComposer.addDirective(ResponseMetadataDirective);
        typeTC.addFields({
          _response: {
            type: responseMetadataType,
            directives: [
              {
                name: 'responseMetadata',
                args: {
                  subgraph: subgraphName,
                },
              },
            ],
          },
        });
      }

      if ('responseByStatusCode' in operationConfig) {
        const unionOrSingleTC = schemaComposer.getAnyTC(getNamedType(field.type.getType()));
        const types =
          'getTypes' in unionOrSingleTC ? unionOrSingleTC.getTypes() : [unionOrSingleTC];
        const statusCodeOneOfIndexMap: Record<string, number> = {};
        const directives = unionOrSingleTC.getDirectives();
        for (const directive of directives) {
          if (directive.name === 'statusCodeOneOfIndex') {
            statusCodeOneOfIndexMap[directive.args?.statusCode as string] = directive.args
              ?.oneOfIndex as number;
          }
        }
        for (const statusCode in operationConfig.responseByStatusCode) {
          const responseConfig = operationConfig.responseByStatusCode[statusCode];
          if (responseConfig.links || responseConfig.exposeResponseMetadata) {
            const typeTCThunked = types[statusCodeOneOfIndexMap[statusCode] || 0];
            const originalName = typeTCThunked.getTypeName();
            let typeTC = schemaComposer.getAnyTC(originalName);
            if (!('addFieldArgs' in typeTC)) {
              schemaComposer.addDirective(ResolveRootDirective);
              typeTC = schemaComposer.createObjectTC({
                name: `${operationConfig.field}_${statusCode}_response`,
                fields: {
                  [originalName]: {
                    type: typeTC as any,
                    directives: [
                      {
                        name: 'resolveRoot',
                        args: {
                          subgraph: subgraphName,
                        },
                      },
                    ],
                  },
                },
              });
              // If it is a scalar or enum type, it cannot be a union type, so we can set it directly
              types[0] = typeTC;
              field.type = typeTC;
            }
            if (responseConfig.exposeResponseMetadata) {
              schemaComposer.addDirective(ResponseMetadataDirective);
              typeTC.addFields({
                _response: {
                  type: responseMetadataType,
                  directives: [
                    {
                      name: 'responseMetadata',
                      args: {
                        subgraph: subgraphName,
                      },
                    },
                  ],
                },
              });
            }
            if (responseConfig.links) {
              handleLinkMap(responseConfig.links, typeTC as ObjectTypeComposer);
            }
          }
        }
      }
    }
  }

  logger.debug(`Building the executable schema.`);
  if (schemaComposer.Query.getFieldNames().length === 0) {
    schemaComposer.Query.addFields({
      dummy: {
        type: 'String',
        resolve: () => 'dummy',
      },
    });
  }

  schemaComposer.addDirective(TransportDirective);
  let schema = schemaComposer.buildSchema();
  const schemaExtensions: any = (schema.extensions = schema.extensions || {});
  schemaExtensions.directives = schemaExtensions.directives || {};
  schemaExtensions.directives.transport = {
    subgraph: subgraphName,
    kind: handlerName,
    location: endpoint,
    headers: operationHeaders ? Object.entries(operationHeaders) : undefined,
    queryParams: queryParams ? Object.entries(queryParams) : undefined,
    queryStringOptions,
  };
  // Fix orphaned interfaces
  schema = mapSchema(schema, {
    [MapperKind.TYPE]: type => {
      if (isInterfaceType(type)) {
        const { objects, interfaces } = schema.getImplementations(type);
        if (objects.length === 0 && interfaces.length === 0) {
          return new GraphQLObjectType(type.toConfig() as any);
        }
      }
      return type;
    },
  });
  return schema;
}
