import { GraphQLSchema } from 'graphql';
import {
  OutputTransformation,
  SchemaTransformation,
} from './config';
import {
  OutputTransformationFn,
  SchemaTransformationFn,
  MeshHandlerLibrary
} from '@graphql-mesh/types';
import { resolve } from 'path';

export async function applySchemaTransformations(
  name: string,
  schema: GraphQLSchema,
  transformations: SchemaTransformation[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;
  for (const transformation of transformations) {
    const transformationFn = await getPackage<SchemaTransformationFn<any>>(
      transformation.type,
      'transformation'
    );
    resultSchema = await transformationFn({
      apiName: name,
      schema: schema,
      config: transformation
    });
  }
  return resultSchema;
}

export async function applyOutputTransformations(
  schema: GraphQLSchema,
  transformations: OutputTransformation[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    const transformationFn = await getPackage<OutputTransformationFn<any>>(
      transformation.type,
      'transformation'
    );

    resultSchema = await transformationFn({
      schema,
      config: transformation
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
