import { Logger } from '@graphql-mesh/types';
import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import Ajv from 'ajv';
import {
  AnyTypeComposer,
  ComposeInputType,
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

export function getContainerTC(schemaComposer: SchemaComposer, output: ComposeInputType) {
  const containerTypeName = `${output.getTypeName()}_container`;
  return schemaComposer.getOrCreateOTC(containerTypeName, otc =>
    otc.addFields({
      [output.getTypeName()]: {
        type: output as any,
        resolve: root => root,
      },
    })
  );
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
      outputTypeComposers.push(getContainerTC(schemaComposer, output));
    } else {
      outputTypeComposers.push(output);
    }
    if (input) {
      unionInputFields[input.getTypeName()] = {
        type: input,
      };
    }
    if (!input) {
      logger.debug(`No input type composer found for ${output.getTypeName()}, skipping...`);
    }
  });

  if (Object.keys(unionInputFields).length === 1) {
    subSchemaAndTypeComposers.input = Object.values(unionInputFields)[0].type;
  } else {
    (subSchemaAndTypeComposers.input as InputTypeComposer).addFields(unionInputFields);
    if (!schemaComposer.hasDirective('oneOf')) {
      schemaComposer.addTypeDefs(ONE_OF_DEFINITION);
    }
  }

  const dedupSet = new Set(outputTypeComposers);

  if (dedupSet.size === 1) {
    subSchemaAndTypeComposers.output = outputTypeComposers[0];
  } else {
    const resolveType = getTypeResolverFromOutputTCs(
      ajv,
      outputTypeComposers,
      subSchemaAndTypeComposers,
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
  }

  return {
    input: subSchemaAndTypeComposers.input as InputTypeComposer,
    output: subSchemaAndTypeComposers.output as UnionTypeComposer,
    nullable: subSchemaAndTypeComposers.nullable,
    readOnly: subSchemaAndTypeComposers.readOnly,
    writeOnly: subSchemaAndTypeComposers.writeOnly,
  };
}
