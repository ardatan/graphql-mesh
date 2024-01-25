import {
  buildASTSchema,
  buildSchema,
  DocumentNode,
  getOperationAST,
  GraphQLFieldMap,
  GraphQLSchema,
  GraphQLType,
  isEnumType,
  isSchema,
  Kind,
  OperationTypeNode,
  parse,
  print,
} from 'graphql';
import {
  getDirective,
  getRootTypeMap,
  isDocumentNode,
  MapperKind,
  mapSchema,
} from '@graphql-tools/utils';

const entityResolverDefinition = {
  name: 'federationEntity',
  operation: `query getFederationEntity($representations: [_Any!]!) { _entities(representations: $representations) }`,
  kind: 'BATCH',
};

const schemaBuildOpts = { noLocation: true, assumeValid: true, assumeValidSDL: true };
export function convertFusionSupergraphFromFederationSupergraph(
  federationSupergraph: DocumentNode | string | GraphQLSchema,
) {
  let federationSupergraphSchema: GraphQLSchema;
  if (isSchema(federationSupergraph)) {
    federationSupergraphSchema = federationSupergraph;
  } else if (isDocumentNode(federationSupergraph)) {
    federationSupergraphSchema = buildASTSchema(federationSupergraph, schemaBuildOpts);
  } else {
    federationSupergraphSchema = buildSchema(federationSupergraph, schemaBuildOpts);
  }
  const subgraphLocationMap = new Map<string, string>();
  const joinGraphEnum = federationSupergraphSchema.getType('join__Graph');
  if (!isEnumType(joinGraphEnum)) {
    throw new Error('Expected join__Graph to be an enum');
  }
  for (const joinGraphEnumValue of joinGraphEnum.getValues()) {
    const joinGraphDirective = getDirective(
      federationSupergraphSchema,
      joinGraphEnumValue,
      'join__graph',
    );
    if (!joinGraphDirective?.length) {
      throw new Error('Expected join__Graph to have a join__graph directive');
    }
    const { url } = joinGraphDirective[0];
    subgraphLocationMap.set(joinGraphEnumValue.value, url);
  }

  const typeMap = new Map<string, GraphQLType>();
  const rootTypeMap = getRootTypeMap(federationSupergraphSchema);
  const operationByRootType = new Map<string, OperationTypeNode>();
  for (const [operationType, rootType] of rootTypeMap) {
    operationByRootType.set(rootType.name, operationType);
  }

  const fusionSupergraphSchema = mapSchema(federationSupergraphSchema, {
    [MapperKind.TYPE](type) {
      if (type.name.startsWith('link__') || type.name.startsWith('join__')) {
        return null;
      }
      const typeExtensions: any = (type.extensions ||= {});
      const typeDirectiveExtensions: any = (typeExtensions.directives ||= {});
      const joinTypeDirectives = getDirective(federationSupergraphSchema, type, 'join__type');
      const sourceDirectivesForFusion: any[] = (typeDirectiveExtensions.source ||= []);
      const variableDirectivesForFusion: any[] = (typeDirectiveExtensions.variable ||= []);
      const fieldMap: GraphQLFieldMap<any, any> = (type as any).getFields?.();
      const combinedVariableValues = new Set<string>();
      const resolverDirectives = (typeDirectiveExtensions.resolver ||= []);
      for (const joinTypeDirective of joinTypeDirectives || []) {
        if (!joinTypeDirective.external) {
          sourceDirectivesForFusion.push({
            name: type.name,
            subgraph: joinTypeDirective.graph,
          });
        }
        if (joinTypeDirective.key) {
          const fakeOpForRequiresSelectionSet = parse(`{ ${joinTypeDirective.key} }`);
          const operationAst = getOperationAST(fakeOpForRequiresSelectionSet, undefined);
          if (!operationAst) {
            throw new Error(`Expected requires to be a valid selection set for ${type.name}`);
          }
          for (const selection of operationAst.selectionSet.selections) {
            if (selection.kind === Kind.FIELD) {
              const selectionName = selection.name.value;
              const varName = `${type.name}_key_${selectionName}`;
              const selectionFieldObject = fieldMap[selectionName];
              if (!selectionFieldObject) {
                throw new Error(`Expected field ${selectionName} to exist on type ${type.name}`);
              }
              let availableSubgraphsForField: string[] = [];
              const joinFieldDirectives = getDirective(
                federationSupergraphSchema,
                selectionFieldObject,
                'join__field',
              );
              if (joinFieldDirectives?.length) {
                availableSubgraphsForField = joinFieldDirectives
                  .filter(joinFieldDirective => !joinFieldDirective.external)
                  .map(joinFieldDirective => joinFieldDirective.graph);
              } else {
                availableSubgraphsForField = joinTypeDirectives.map(
                  joinTypeDirective => joinTypeDirective.graph,
                );
              }
              for (const availableSubgraph of availableSubgraphsForField) {
                variableDirectivesForFusion.push({
                  name: varName,
                  select: print(selection),
                  subgraph: availableSubgraph,
                });
              }
              combinedVariableValues.add(`${selectionName}: $${varName}`);
            }
          }
          const mainVariable = {
            name: `representations`,
            subgraph: joinTypeDirective.graph,
            value: `{ ${[...combinedVariableValues].join(', ')} }`,
          };
          variableDirectivesForFusion.push(mainVariable);
          resolverDirectives.push({
            name: 'federationEntity',
            subgraph: joinTypeDirective.graph,
          });
        }
      }
      typeMap.set(type.name, type);
      return type;
    },
    [MapperKind.FIELD](fieldConfig, fieldName, typeName) {
      const type = typeMap.get(typeName);
      if (!type) {
        throw new Error(`Expected type ${typeName} to exist`);
      }
      if (!('getFields' in type)) {
        throw new Error(`Expected type ${typeName} to be an object type`);
      }
      const typeFieldMap = type.getFields();
      const typeDirectiveExtensions: any = ((type.extensions ||= {} as any).directives ||= {});
      const typeVariableDirectives = (typeDirectiveExtensions.variable ||= []);
      const representationsVariable = typeVariableDirectives.find(
        (directive: any) => directive.name === 'representations',
      );
      const fieldExtensions: any = (fieldConfig.extensions ||= {});
      const fieldDirectiveExtensions: any = (fieldExtensions.directives ||= {});
      const joinFieldDirectives = getDirective(
        federationSupergraphSchema,
        fieldConfig,
        'join__field',
      );
      const sourceDirectivesForFusion: any[] = (fieldDirectiveExtensions.source ||= []);
      const variableDirectivesForFusion: any[] = (fieldDirectiveExtensions.variable ||= []);
      // TODO: Pass this to type's representations
      const combinedVariableValues: string[] = [];
      for (const joinFieldDirective of joinFieldDirectives || []) {
        if (!joinFieldDirective.external) {
          sourceDirectivesForFusion.push({
            subgraph: joinFieldDirective.graph,
            name: fieldName,
          });
        }
        if (joinFieldDirective.requires) {
          const fakeOpForRequiresSelectionSet = parse(`{ ${joinFieldDirective.requires} }`);
          const operationAst = getOperationAST(fakeOpForRequiresSelectionSet, undefined);
          if (!operationAst) {
            throw new Error(`Expected requires to be a valid selection set for ${fieldName}`);
          }
          for (const selection of operationAst.selectionSet.selections) {
            if (selection.kind === 'Field') {
              const selectionName = selection.name.value;
              const varName = `${typeName}_${fieldName}_requires_${selectionName}`;
              const selectionFieldObject = typeFieldMap[selectionName];
              if (!selectionFieldObject) {
                throw new Error(`Expected field ${selectionName} to exist on type ${typeName}`);
              }
              const joinFieldDirectives = getDirective(
                federationSupergraphSchema,
                selectionFieldObject,
                'join__field',
              );
              for (const joinFieldDirective of joinFieldDirectives || []) {
                if (!joinFieldDirective.external) {
                  variableDirectivesForFusion.push({
                    name: varName,
                    select: print(selection),
                    subgraph: joinFieldDirective.graph,
                  });
                }
              }
              combinedVariableValues.push(`${selectionName}: $${varName}`);
            } else {
              throw new Error(`Kind ${selection.kind} not supported for requires selection set`);
            }
          }
        }
        const operationType = operationByRootType.get(type.name);
        if (operationType) {
          const operationName =
            operationType === 'query' ? fieldName : `${operationType}${fieldName}`;
          const variableDefinitions: string[] = [];
          const rootFieldArgs: string[] = [];
          if ('args' in fieldConfig && fieldConfig.args) {
            for (const argName in fieldConfig.args) {
              const arg = fieldConfig.args[argName];
              let variableDefinitionStr = `$${argName}: ${arg.type}`;
              if (arg.defaultValue) {
                variableDefinitionStr += ` = ${
                  typeof arg.defaultValue === 'string'
                    ? JSON.stringify(arg.defaultValue)
                    : arg.defaultValue
                }`;
              }
              variableDefinitions.push(variableDefinitionStr);
              rootFieldArgs.push(`${argName}: $${argName}`);
            }
          }
          const variableDefinitionsString = variableDefinitions.length
            ? `(${variableDefinitions.join(', ')})`
            : '';
          const rootFieldArgsString = rootFieldArgs.length ? `(${rootFieldArgs.join(', ')})` : '';
          const operationString = `${operationType} ${operationName}${variableDefinitionsString} { ${fieldName}${rootFieldArgsString} }`;
          const resolverDirectives = (fieldDirectiveExtensions.resolver ||= []);
          resolverDirectives.push({
            subgraph: joinFieldDirective.subgraph,
            operation: operationString,
          });
        }
      }
      if (!joinFieldDirectives?.length) {
        const typeSourceDirectives: any[] = (typeDirectiveExtensions.source ||= []);
        for (const typeSourceDirective of typeSourceDirectives) {
          sourceDirectivesForFusion.push({
            subgraph: typeSourceDirective.subgraph,
            name: fieldName,
          });
        }
      }
      if (combinedVariableValues.length) {
        const existingVariableValuesStr = representationsVariable.value
          .substring(1, representationsVariable.value.length - 2)
          .trim();
        const variableValues = new Set<string>(
          existingVariableValuesStr.split(',').map((str: string) => str.trim()),
        );
        for (const combinedVariableValue of combinedVariableValues) {
          variableValues.add(combinedVariableValue.trim());
        }
        representationsVariable.value = `{ ${[...variableValues].join(', ')} }`;
      }
      const seenTypeVariableKeys = new Set<string>();
      typeDirectiveExtensions.variable = typeVariableDirectives.filter((variableDirective: any) => {
        const variableKey = variableDirective.name + '_' + variableDirective.subgraph;
        if (seenTypeVariableKeys.has(variableKey)) {
          return false;
        }
        seenTypeVariableKeys.add(variableKey);
        return true;
      });
      return fieldConfig;
    },
    [MapperKind.ENUM_VALUE](enumValueConfig, enumValueName) {
      const enumValueExtensions: any = (enumValueConfig.extensions ||= {});
      const enumValueDirectiveExtensions: any = (enumValueExtensions.directives ||= {});
      const joinEnumValueDirectives = getDirective(
        federationSupergraphSchema,
        enumValueConfig,
        'join__enumValue',
      );
      const sourceDirectivesForFusion: any[] = (enumValueDirectiveExtensions.source ||= []);
      for (const joinEnumValueDirective of joinEnumValueDirectives || []) {
        sourceDirectivesForFusion.push({
          subgraph: joinEnumValueDirective.graph,
          name: enumValueName,
        });
      }
      return enumValueConfig;
    },
    [MapperKind.DIRECTIVE](directiveConfig) {
      if (
        directiveConfig.name.startsWith('join__') ||
        directiveConfig.name === 'link__' ||
        directiveConfig.name === 'link'
      ) {
        return null;
      }
    },
  });

  const fusionSupergraphSchemaExtensions: any = (fusionSupergraphSchema.extensions ||= {});
  const fusionSupergraphDirectiveExtensions: any = (fusionSupergraphSchemaExtensions.directives ||=
    {});
  const fusionTransportDefs = (fusionSupergraphDirectiveExtensions.transport ||= []);
  const fusionGlobalResolverDefs = (fusionSupergraphDirectiveExtensions.resolver ||= []);
  for (const [subgraph, location] of subgraphLocationMap.entries()) {
    fusionTransportDefs.push({
      subgraph,
      kind: 'http',
      location,
    });
    fusionGlobalResolverDefs.push({
      subgraph,
      ...entityResolverDefinition,
    });
  }

  return fusionSupergraphSchema;
}
