import { GraphQLSchema, isEnumType, GraphQLEnumValueConfigMap, GraphQLEnumType } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import {
  RenameTypes,
  RenameObjectFields,
  RenameRootFields,
  RenameRootTypes,
  RenameInputObjectFields,
  RenameInterfaceFields,
} from '@graphql-tools/wrap';
import {
  applySchemaTransforms,
  applyRequestTransforms,
  Request,
  applyResultTransforms,
  Result,
  Transform,
} from '@graphql-tools/utils';

import {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  headerCase,
  noCase,
  paramCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
} from 'change-case';

import { upperCase } from 'upper-case';
import { lowerCase } from 'lower-case';

type NamingConventionFn = (input: string) => string;
type NamingConventionType = YamlConfig.NamingConventionTransformConfig['typeNames'];

const NAMING_CONVENTIONS: Record<NamingConventionType, NamingConventionFn> = {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  headerCase,
  noCase,
  paramCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
  upperCase,
  lowerCase,
};

class RenameEnumValuesTransform implements Transform {
  constructor(private renamer: (typeName: string, value: string) => string) {}
  transformSchema(schema: GraphQLSchema) {
    const typeMap = schema.getTypeMap();
    for (const typeName in typeMap) {
      const type = typeMap[typeName];
      if (isEnumType(type)) {
        const enumConfig = type.toConfig();
        const newValuesMap: GraphQLEnumValueConfigMap = {};
        const oldValuesMap = enumConfig.values;
        for (const oldValue in oldValuesMap) {
          newValuesMap[this.renamer(typeName, oldValue)] = oldValuesMap[oldValue];
        }
        enumConfig.values = newValuesMap;
        typeMap[typeName] = new GraphQLEnumType(enumConfig);
      }
    }
    return schema;
  }
}

export default class NamingConventionTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
    if (options.config.typeNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.typeNames];
      this.transforms.push(
        new RenameTypes(typeName => namingConventionFn(typeName)),
        new RenameRootTypes(typeName => namingConventionFn(typeName))
      );
    }
    if (options.config.fieldNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.fieldNames];
      this.transforms.push(
        new RenameObjectFields((_, fieldName) => namingConventionFn(fieldName)),
        new RenameRootFields((_, fieldName) => namingConventionFn(fieldName)),
        new RenameInputObjectFields((_, fieldName) => namingConventionFn(fieldName)),
        new RenameInterfaceFields((_, fieldName) => namingConventionFn(fieldName))
      );
    }
    if (options.config.enumValues) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.enumValues];
      this.transforms.push(new RenameEnumValuesTransform((_, enumValue) => namingConventionFn(enumValue)));
    }
  }

  transformSchema(schema: GraphQLSchema) {
    return applySchemaTransforms(schema, this.transforms);
  }

  transformRequest(request: Request) {
    return applyRequestTransforms(request, this.transforms);
  }

  transformResult(result: Result) {
    return applyResultTransforms(result, this.transforms);
  }
}
