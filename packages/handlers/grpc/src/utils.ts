import { KeyValueCache } from '@graphql-mesh/types';
import { jsonFlatStringify, readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { ClientReadableStream, ClientUnaryCall, Metadata, MetadataValue } from '@grpc/grpc-js';
import { existsSync } from 'fs';
import { GraphQLEnumTypeConfig } from 'graphql';
import { InputTypeComposer, ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import _ from 'lodash';
import { pascalCase } from 'pascal-case';
import { isAbsolute, join } from 'path';
import { IField, Root } from 'protobufjs';

import { getGraphQLScalar, isScalarType } from './scalars';

export type ClientMethod = (
  input: unknown,
  metaData?: Metadata
) => Promise<ClientUnaryCall> | AsyncIterator<ClientReadableStream<unknown>>;

interface InputOutputTypes {
  input: string;
  output: string;
}

export function toSnakeCase(str: string): string {
  return str.split('.').join('_');
}

export function addIncludePathResolver(root: Root, includePaths: string[]): void {
  const originalResolvePath = root.resolvePath;
  root.resolvePath = (origin: string, target: string) => {
    if (isAbsolute(target)) {
      return target;
    }
    for (const directory of includePaths) {
      const fullPath: string = join(directory, target);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
    const path = originalResolvePath(origin, target);
    if (path === null) {
      console.warn(`${target} not found in any of the include paths ${includePaths}`);
    }
    return path;
  };
}

export function addMetaDataToCall(
  call: ClientMethod,
  input: unknown,
  context: Record<string, unknown>,
  metaData: Record<string, string | string[] | Buffer>
): Promise<ClientUnaryCall> | AsyncIterator<ClientReadableStream<unknown>> {
  if (metaData) {
    const meta = new Metadata();
    for (const [key, value] of Object.entries(metaData)) {
      let metaValue: unknown = value;
      if (Array.isArray(value)) {
        // Extract data from context
        metaValue = _.get(context, value);
      }
      // Ensure that the metadata is compatible with what node-grpc expects
      if (typeof metaValue !== 'string' && !(metaValue instanceof Buffer)) {
        metaValue = jsonFlatStringify(metaValue);
      }

      meta.add(key, metaValue as MetadataValue);
    }

    return call(input, meta);
  }
  return call(input);
}

export async function getBuffer(path: string, cache: KeyValueCache, cwd: string): Promise<Buffer> {
  if (path) {
    const result = await readFileOrUrlWithCache<string>(path, cache, {
      allowUnknownExtensions: true,
      cwd,
    });
    return Buffer.from(result);
  }
  return undefined;
}

export function getTypeName(
  schemaComposer: SchemaComposer<unknown>,
  typePath: string,
  isInput: boolean,
  packageName: string
): string {
  if (isScalarType(typePath)) {
    return getGraphQLScalar(typePath);
  }
  let baseTypeName = pascalCase(typePath);
  const packageNamePrefix = pascalCase(packageName);
  if (baseTypeName.startsWith(packageNamePrefix)) {
    baseTypeName = baseTypeName.replace(packageNamePrefix, '');
  }
  if (isInput && !schemaComposer.isEnumType(baseTypeName)) {
    baseTypeName += 'Input';
  }
  return baseTypeName;
}

export function createEnum(typeName: string, values: Record<string, number>): GraphQLEnumTypeConfig {
  const enumTypeConfig: GraphQLEnumTypeConfig = {
    name: typeName,
    values: {},
  };
  for (const [key, value] of Object.entries(values)) {
    enumTypeConfig.values[key] = {
      value,
    };
  }
  return enumTypeConfig;
}

export function createFieldsType(typeName: string): InputOutputTypes {
  return {
    input: typeName + 'Input',
    output: typeName,
  };
}

export async function addInputOutputFields(
  schemaComposer: SchemaComposer<unknown>,
  inputTC: InputTypeComposer,
  outputTC: ObjectTypeComposer,
  fields: { [k: string]: IField },
  name: string,
  currentPath: string,
  packageName: string
): Promise<void> {
  const fieldKeys = Object.keys(fields);
  if (!fieldKeys.length) {
    // This is a empty proto type
    inputTC.addFields({
      _: {
        type: () => {
          return getTypeName(schemaComposer, 'bool', true, packageName);
        },
      },
    });
    outputTC.addFields({
      _: {
        type: () => {
          return getTypeName(schemaComposer, 'bool', true, packageName);
        },
      },
    });
  }
  await Promise.all(
    fieldKeys.map(async fieldName => {
      const { type, rule } = fields[fieldName];
      let fullType = type;
      if (
        packageName &&
        !isScalarType(type) &&
        !type.includes('.') &&
        currentPath.length &&
        name.includes(currentPath)
      ) {
        fullType = pascalCase(currentPath + type);
      }

      inputTC.addFields({
        [fieldName]: {
          type: () => {
            const inputTypeName = getTypeName(schemaComposer, fullType, true, packageName);
            return rule === 'repeated' ? `[${inputTypeName}]` : inputTypeName;
          },
        },
      });
      outputTC.addFields({
        [fieldName]: {
          type: () => {
            const typeName = getTypeName(schemaComposer, fullType, false, packageName);
            return rule === 'repeated' ? `[${typeName}]` : typeName;
          },
        },
      });
    })
  );
}

export function createInputOutput(
  schemaComposer: SchemaComposer<unknown>,
  name: string,
  currentPath: string,
  packageName: string,
  fields: { [k: string]: IField }
): void {
  const { input, output } = createFieldsType(name);

  const inputTC = schemaComposer.createInputTC({
    name: input,
    fields: {},
  });
  const outputTC = schemaComposer.createObjectTC({
    name: output,
    fields: {},
  });
  addInputOutputFields(
    schemaComposer,
    inputTC,
    outputTC,
    fields,
    name,
    pascalCase(toSnakeCase(currentPath)),
    packageName
  );
}
