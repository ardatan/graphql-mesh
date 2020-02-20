import 'ts-node/register/transpile-only';
import { IResolvers } from 'graphql-tools-fork';
import { AdditionalResolvers } from './config';
import { Transformation } from './types';
import { GraphQLSchema } from 'graphql';
import {
  OutputTransformationFn,
  SchemaTransformationFn,
  MeshHandlerLibrary
} from '@graphql-mesh/types';
import { resolve } from 'path';

export async function applySchemaTransformations(
  name: string,
  schema: GraphQLSchema,
  transformations: Transformation<SchemaTransformationFn>[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;
  for (const transformation of transformations) {
    resultSchema = await transformation.transformer({
      apiName: name,
      schema: schema,
      config: transformation.config
    });
  }
  return resultSchema;
}

export async function applyOutputTransformations(
  schema: GraphQLSchema,
  transformations: Transformation<OutputTransformationFn>[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    resultSchema = await transformation.transformer({
      schema,
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
  additionalResolvers: AdditionalResolvers
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
