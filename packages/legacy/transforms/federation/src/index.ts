import { dset } from 'dset';
import type { GraphQLSchema } from 'graphql';
import {
  GraphQLEnumType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  isObjectType,
  isSpecifiedScalarType,
} from 'graphql';
import { entitiesField, EntityType, serviceField } from '@apollo/subgraph/dist/types.js';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type {
  ImportFn,
  MeshTransform,
  MeshTransformOptions,
  YamlConfig,
} from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import type { MergedTypeResolver, SubschemaConfig } from '@graphql-tools/delegate';
import { MapperKind, mapSchema, printSchemaWithDirectives } from '@graphql-tools/utils';

const federationDirectives = [
  'link',

  'key',
  'interfaceObject',
  'extends',

  'shareable',
  'inaccessible',
  'override',

  'external',
  'provides',
  'requires',
  'tag',
  'composeDirective',
];

export default class FederationTransform implements MeshTransform {
  private apiName: string;
  private config: YamlConfig.Transform['federation'];
  private baseDir: string;
  private importFn: ImportFn;

  noWrap = true;

  constructor({
    apiName,
    baseDir,
    config,
    importFn,
  }: MeshTransformOptions<YamlConfig.Transform['federation']>) {
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
        const typeDirectivesObj: any = ((typeObj.extensions as any).directives =
          typeObj.extensions.directives || {});
        if (type.config?.key) {
          typeDirectivesObj.key = type.config.key;
        }
        if (type.config?.shareable) {
          typeDirectivesObj.shareable = type.config.shareable;
        }
        if (type.config?.extends) {
          typeDirectivesObj.extends = type.config.extends;
        }
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
            rawSource.merge[type.name].fields[field.name] =
              rawSource.merge[type.name].fields[field.name] || {};
            if (field.config.requires) {
              rawSource.merge[type.name].fields[field.name].computed = true;
              rawSource.merge[type.name].fields[field.name].selectionSet =
                `{ ${field.config.requires} }`;
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
                if (argVal) {
                  dset(args, argName, argVal);
                }
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

    const entityTypes: GraphQLObjectType[] = [];

    for (const typeName in rawSource.merge || {}) {
      const type = schema.getType(typeName);
      if (isObjectType(type)) {
        entityTypes.push(type);
      }
      dset(type, 'extensions.apollo.subgraph.resolveReference', rawSource.merge[typeName].resolve);
    }

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
              resolve: (root, args, context, info) => ({
                sdl: printSchemaWithDirectives(info.schema),
              }),
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
            types: entityTypes,
          });
        }
        return type;
      },
    });

    schemaWithUnionType.extensions = schemaWithUnionType.extensions || {};
    const directivesObj: any = ((schemaWithUnionType.extensions as any).directives =
      schemaWithUnionType.extensions.directives || {});

    const existingDirectives = schemaWithUnionType.getDirectives();
    const filteredDirectives = existingDirectives.filter(directive =>
      federationDirectives.includes(directive.name),
    );

    directivesObj.link = {
      url: 'https://specs.apollo.dev/federation/' + (this.config.version || 'v2.0'),
      import: filteredDirectives
        .filter(({ name }) => name !== 'link')
        .map(dirName => `@${dirName.name}`),
    };

    if (existingDirectives.length === filteredDirectives.length) {
      return schemaWithUnionType;
    }

    return mapSchema(schemaWithUnionType, {
      [MapperKind.DIRECTIVE]: directive => {
        if (federationDirectives.includes(directive.name)) {
          return directive;
        }
        return null;
      },
      [MapperKind.OBJECT_TYPE]: type => {
        return new GraphQLObjectType({
          ...type.toConfig(),
          astNode: type.astNode && {
            ...type.astNode,
            directives: type.astNode.directives?.filter(directive =>
              federationDirectives.includes(directive.name.value),
            ),
          },
          extensions: {
            ...type.extensions,
            directives: Object.fromEntries(
              Object.entries(type.extensions?.directives || {}).filter(([key]) =>
                federationDirectives.includes(key),
              ),
            ),
          },
        });
      },
      [MapperKind.INTERFACE_TYPE]: type => {
        return new GraphQLInterfaceType({
          ...type.toConfig(),
          astNode: type.astNode && {
            ...type.astNode,
            directives: type.astNode.directives?.filter(directive =>
              federationDirectives.includes(directive.name.value),
            ),
          },
          extensions: {
            ...type.extensions,
            directives: Object.fromEntries(
              Object.entries(type.extensions?.directives || {}).filter(([key]) =>
                federationDirectives.includes(key),
              ),
            ),
          },
        });
      },
      [MapperKind.COMPOSITE_FIELD]: fieldConfig => {
        return {
          ...fieldConfig,
          astNode: fieldConfig.astNode && {
            ...fieldConfig.astNode,
            directives: fieldConfig.astNode.directives?.filter(directive =>
              federationDirectives.includes(directive.name.value),
            ),
          },
          extensions: {
            ...fieldConfig.extensions,
            directives: Object.fromEntries(
              Object.entries(fieldConfig.extensions?.directives || {}).filter(([key]) =>
                federationDirectives.includes(key),
              ),
            ),
          },
        };
      },
      [MapperKind.SCALAR_TYPE]: type => {
        if (isSpecifiedScalarType(type)) {
          return type;
        }
        return new GraphQLScalarType({
          ...type.toConfig(),
          astNode: type.astNode && {
            ...type.astNode,
            directives: type.astNode.directives?.filter(directive =>
              federationDirectives.includes(directive.name.value),
            ),
          },
          extensions: {
            ...type.extensions,
            directives: Object.fromEntries(
              Object.entries(type.extensions?.directives || {}).filter(([key]) =>
                federationDirectives.includes(key),
              ),
            ),
          },
        });
      },
      [MapperKind.ENUM_TYPE]: type =>
        new GraphQLEnumType({
          ...type.toConfig(),
          astNode: type.astNode && {
            ...type.astNode,
            directives: type.astNode.directives?.filter(directive =>
              federationDirectives.includes(directive.name.value),
            ),
          },
          extensions: {
            ...type.extensions,
            directives: Object.fromEntries(
              Object.entries(type.extensions?.directives || {}).filter(([key]) =>
                federationDirectives.includes(key),
              ),
            ),
          },
        }),
      [MapperKind.ENUM_VALUE]: enumValueConfig => ({
        ...enumValueConfig,
        astNode: enumValueConfig.astNode && {
          ...enumValueConfig.astNode,
          directives: enumValueConfig.astNode.directives?.filter(directive =>
            federationDirectives.includes(directive.name.value),
          ),
        },
        extensions: {
          ...enumValueConfig.extensions,
          directives: Object.fromEntries(
            Object.entries(enumValueConfig.extensions?.directives || {}).filter(([key]) =>
              federationDirectives.includes(key),
            ),
          ),
        },
      }),
    });
  }
}
