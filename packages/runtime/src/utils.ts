import 'ts-node/register/transpile-only';
import { IResolvers } from 'graphql-tools-fork';
import { ResolvedTransform, GraphQLOperation } from './types';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLResolveInfo,
  DocumentNode,
  parse
} from 'graphql';
import { Hooks, MeshHandlerLibrary } from '@graphql-mesh/types';
import { resolve } from 'path';
import Maybe from 'graphql/tsutils/Maybe';

export async function applySchemaTransformations(
  name: string,
  schema: GraphQLSchema,
  transformations: ResolvedTransform[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    resultSchema = await transformation.transformFn({
      apiName: name,
      schema: resultSchema,
      config: transformation.config
    });
  }

  return resultSchema;
}

export async function applyOutputTransformations(
  schema: GraphQLSchema,
  transformations: ResolvedTransform[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    resultSchema = await transformation.transformFn({
      schema: resultSchema,
      config: transformation.config
    });
  }

  return resultSchema;
}

export async function getPackage<T>(name: string, type: string): Promise<T> {
  const possibleNames = [
    `@graphql-mesh/${name}`,
    `@graphql-mesh/${name}-${type}`,
    name
  ];
  const possibleModules = possibleNames.concat(resolve(process.cwd(), name));

  for (const moduleName of possibleModules) {
    try {
      const exported = await import(moduleName);

      return (exported.default || exported.parser || exported) as T;
    } catch (err) {
      if (err.message.indexOf(`Cannot find module '${moduleName}'`) === -1) {
        throw new Error(
          `Unable to load ${type} matching ${name}: ${err.message}`
        );
      }
    }
  }

  throw new Error(`Unable to find ${type} matching ${name}`);
}

export async function getHandler(name: string): Promise<MeshHandlerLibrary> {
  const handlerFn = await getPackage<MeshHandlerLibrary>(name, 'handler');

  return handlerFn;
}

export async function resolveAdditionalResolvers(
  baseDir: string,
  additionalResolvers: string[]
): Promise<IResolvers> {
  const loaded = await Promise.all(
    (additionalResolvers || []).map(async filePath => {
      const exported = require(resolve(baseDir, filePath));
      let resolvers = null;

      if (exported.default) {
        if (exported.default.resolvers) {
          resolvers = exported.default.resolvers;
        } else if (typeof exported.default === 'object') {
          resolvers = exported.default;
        }
      } else if (exported.resolvers) {
        resolvers = exported.resolvers;
      }

      if (!resolvers) {
        console.warn(`Unable to load resolvers from file: ${filePath}`);

        return {};
      }

      return resolvers;
    })
  );

  return loaded.reduce((prev, t) => {
    return {
      ...prev,
      ...t
    };
  }, {} as IResolvers);
}

export function extractSdkFromResolvers(
  schema: GraphQLSchema,
  hooks: Hooks,
  types: Maybe<GraphQLObjectType>[]
) {
  const sdk: Record<string, Function> = {};

  for (const type of types) {
    if (type) {
      const fields = type.getFields();

      for (const [fieldName, field] of Object.entries(fields)) {
        const resolveFn = field.resolve;

        let fn: Function = resolveFn ? (
          args: any,
          context: any,
          info: GraphQLResolveInfo
        ) => resolveFn(null, args, context, info) : () => null;

        hooks.emit('buildSdkFn', {
          schema,
          typeName: type.name,
          fieldName: fieldName,
          originalResolveFn: resolveFn,
          replaceFn: newFn => {
            if (newFn) {
              fn = newFn;
            }
          }
        });

        sdk[fieldName] = fn;
      }
    }
  }

  return sdk;
}

export function ensureDocumentNode(document: GraphQLOperation): DocumentNode {
  return typeof document === 'string' ? parse(document) : document;
}
