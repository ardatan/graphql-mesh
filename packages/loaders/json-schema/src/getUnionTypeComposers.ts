import { Logger } from '@graphql-mesh/types';
import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import Ajv from 'ajv';
import {
  AnyTypeComposer,
  InputTypeComposer,
  isSomeInputTypeComposer,
  ObjectTypeComposer,
  SchemaComposer,
  UnionTypeComposer,
} from 'graphql-compose';
import { TypeComposers } from './getComposerFromJSONSchema';
import { getTypeResolverFromOutputTCs } from './getTypeResolverFromOutputTCs';

const ONE_OF_DEFINITION = /* GraphQL */ `
  directive @oneOf on INPUT_OBJECT | FIELD_DEFINITION
`;

export interface GetUnionTypeComposersOpts {
  schemaComposer: SchemaComposer;
  ajv: Ajv;
  typeComposersList: { input?: AnyTypeComposer<any>; output?: ObjectTypeComposer | UnionTypeComposer }[];
  subSchemaAndTypeComposers: JSONSchemaObject & TypeComposers;
  logger: Logger;
}

export function getUnionTypeComposers({
  schemaComposer,
  ajv,
  typeComposersList,
  subSchemaAndTypeComposers,
  logger,
}: GetUnionTypeComposersOpts) {
  if (typeComposersList.length === 1) {
    return typeComposersList[0];
  }
  const unionInputFields: Record<string, any> = {};
  const outputTypeComposers: (ObjectTypeComposer<any> | UnionTypeComposer<any>)[] = [];
  typeComposersList.forEach(typeComposers => {
    const { input, output } = typeComposers;
    if (isSomeInputTypeComposer(output)) {
      const containerTypeName = `${output.getTypeName()}_container`;
      outputTypeComposers.push(
        schemaComposer.getOrCreateOTC(containerTypeName, otc =>
          otc.addFields({
            [output.getTypeName()]: {
              type: output,
              resolve: root => root,
            },
          })
        )
      );
    } else {
      outputTypeComposers.push(output);
    }
    if (input) {
      unionInputFields[input.getTypeName()] = {
        type: input,
      };
    }
    if (!input) {
      logger.warn(`No input type composer found for ${output.getTypeName()}`);
    }
  });
  (subSchemaAndTypeComposers.input as InputTypeComposer).addFields(unionInputFields);
  if (!schemaComposer.hasDirective('oneOf')) {
    schemaComposer.addTypeDefs(ONE_OF_DEFINITION);
  }

  const resolveType = getTypeResolverFromOutputTCs(
    ajv,
    outputTypeComposers,
    (subSchemaAndTypeComposers.output as UnionTypeComposer).getExtension('statusCodeOneOfIndexMap') as any
  );

  (subSchemaAndTypeComposers.output as UnionTypeComposer).setResolveType(resolveType);

  for (const outputTypeComposer of outputTypeComposers) {
    if ('getFields' in outputTypeComposer) {
      (subSchemaAndTypeComposers.output as UnionTypeComposer).addType(outputTypeComposer);
    } else {
      for (const possibleType of outputTypeComposer.getTypes()) {
        (subSchemaAndTypeComposers.output as UnionTypeComposer).addType(possibleType);
      }
    }
  }

  return {
    input: subSchemaAndTypeComposers.input as InputTypeComposer,
    output: subSchemaAndTypeComposers.output as UnionTypeComposer,
  };
}
