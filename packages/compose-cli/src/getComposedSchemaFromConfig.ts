import {
  buildSchema,
  getNamedType,
  isInterfaceType,
  isNamedType,
  Kind,
  parse,
  print,
  visit,
  type DocumentNode,
  type GraphQLObjectType,
  type GraphQLSchema,
} from 'graphql';
import {
  composeSubgraphs,
  futureAdditions,
  getAnnotatedSubgraphs,
  type FutureAddition,
  type SubgraphConfig,
} from '@graphql-mesh/fusion-composition';
import type { Logger } from '@graphql-mesh/types';
import { parseWithCache } from '@graphql-mesh/utils';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { mergeSchemas } from '@graphql-tools/schema';
import { astFromValueUntyped, printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import type { LoaderContext, MeshComposeCLIConfig } from './types.js';

const isDebug = ['1', 'y', 'yes', 't', 'true'].includes(String(process.env.DEBUG));

export async function getComposedSchemaFromConfig(config: MeshComposeCLIConfig, logger: Logger) {
  const ctx: LoaderContext = {
    fetch: config.fetch || defaultFetch,
    cwd: config.cwd || globalThis.process?.cwd?.(),
    logger,
  };
  const subgraphConfigsForComposition: SubgraphConfig[] = await Promise.all(
    config.subgraphs.map(async subgraphCLIConfig => {
      const { name: subgraphName, schema$ } = subgraphCLIConfig.sourceHandler(ctx);
      const log = logger.child({ subgraph: subgraphName });
      log.debug(`Loading subgraph`);
      let subgraphSchema: GraphQLSchema;
      try {
        subgraphSchema = await schema$;
      } catch (e) {
        if (isDebug) {
          log.error(`Failed to load subgraph`, e);
        } else {
          log.error(e.message || e);
          log.error(`Failed to load subgraph`);
        }
        process.exit(1);
      }
      return {
        name: subgraphName,
        schema: subgraphSchema,
        transforms: subgraphCLIConfig.transforms,
      };
    }),
  );

  let additionalTypeDefs: DocumentNode[] | undefined;
  if (config.additionalTypeDefs != null) {
    let additionalFieldDirectiveUsed = false;
    if (typeof config.additionalTypeDefs === 'string' && config.additionalTypeDefs?.includes(' ')) {
      try {
        additionalTypeDefs = [parseWithCache(config.additionalTypeDefs)];
      } catch (e) {
        logger.error(`Failed to parse additional type definitions: ${e.message || e}`);
        process.exit(1);
      }
    } else {
      const result = await loadTypedefs(config.additionalTypeDefs, {
        noLocation: true,
        assumeValid: true,
        assumeValidSDL: true,
        loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
      });
      additionalTypeDefs = result.map(
        source =>
          source.document ||
          parseWithCache(source.rawSDL || printSchemaWithDirectives(source.schema)),
      );
    }
    additionalTypeDefs = additionalTypeDefs.map(doc =>
      visit(doc, {
        [Kind.FIELD_DEFINITION](node) {
          additionalFieldDirectiveUsed = true;
          return {
            ...node,
            directives: [
              ...(node.directives || []),
              {
                kind: Kind.DIRECTIVE,
                name: { kind: Kind.NAME, value: 'additionalField' },
              },
            ],
          };
        },
      }),
    );
    if (additionalFieldDirectiveUsed) {
      additionalTypeDefs.unshift(
        parse(/* GraphQL */ `
          directive @additionalField on FIELD_DEFINITION
        `),
      );
    }
  }
  if (config.subgraph) {
    const annotatedSubgraphs = getAnnotatedSubgraphs(subgraphConfigsForComposition, {
      ignoreSemanticConventions: config.ignoreSemanticConventions,
      alwaysAddTransportDirective: true,
    });
    const subgraph = annotatedSubgraphs.find(sg => sg.name === config.subgraph);
    if (!subgraph) {
      logger.error(`Subgraph ${config.subgraph} not found`);
      process.exit(1);
    }
    return print(subgraph.typeDefs);
  }
  const result = composeSubgraphs(subgraphConfigsForComposition);
  if (result.errors?.length) {
    logger.error(`Failed to compose subgraphs`);
    for (const error of result.errors) {
      if (isDebug) {
        logger.error(error);
      } else {
        logger.error(error.message || error);
      }
    }
    process.exit(1);
  }
  if (!result.supergraphSdl) {
    logger.error(`Unknown error: Supergraph is empty`);
    process.exit(1);
  }
  let composedSchema: GraphQLSchema;
  if (futureAdditions.length) {
    let futureAddition: FutureAddition;
    while ((futureAddition = futureAdditions.pop())) {
      additionalTypeDefs ||= [];
      composedSchema ||= buildSchema(result.supergraphSdl, {
        noLocation: true,
        assumeValid: true,
        assumeValidSDL: true,
      });
      const sourceType = composedSchema.getType(futureAddition.sourceTypeName) as GraphQLObjectType;
      if (!sourceType) {
        logger.error(`Target type ${futureAddition.sourceTypeName} not found`);
        process.exit(1);
      }
      const sourceField = sourceType.getFields()[futureAddition.sourceFieldName];
      if (!sourceField) {
        logger.error(`Target field ${futureAddition.sourceFieldName} not found`);
        process.exit(1);
      }
      const sourceReturnType = getNamedType(sourceField.type);
      if (!isNamedType(sourceReturnType)) {
        logger.error(`Target field ${futureAddition.sourceFieldName} has no return type`);
        process.exit(1);
      }
      const interfaceOrType = isInterfaceType(composedSchema.getType(futureAddition.targetTypeName))
        ? 'interface'
        : 'type';
      additionalTypeDefs.push(
        parse(/* GraphQL */ `
          extend ${interfaceOrType} ${futureAddition.targetTypeName} {
            ${futureAddition.targetFieldName}: ${sourceReturnType}
            @additionalField
            @resolveTo(
              sourceTypeName: "${futureAddition.sourceTypeName}",
              sourceFieldName: "${futureAddition.sourceFieldName}",
              sourceName: "${futureAddition.sourceName}",
              sourceArgs: ${print(astFromValueUntyped(futureAddition.sourceArgs))},
              requiredSelectionSet: "${futureAddition.requiredSelectionSet}"
            )
          }
        `),
      );
    }
  }
  if (additionalTypeDefs?.length /* TODO || config.transforms?.length */) {
    composedSchema ||= buildSchema(result.supergraphSdl, {
      noLocation: true,
      assumeValid: true,
      assumeValidSDL: true,
    });
    if (additionalTypeDefs?.length) {
      composedSchema = mergeSchemas({
        schemas: [composedSchema],
        typeDefs: additionalTypeDefs,
        assumeValid: true,
        assumeValidSDL: true,
      });
    }
    /* TODO
    if (config.transforms?.length) {
      logger.info('Applying transforms');
      for (const transform of config.transforms) {
        composedSchema = transform(composedSchema);
      }
    }
    */
    return printSchemaWithDirectives(composedSchema);
  }
  return result.supergraphSdl;
}
