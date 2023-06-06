import {
  AnyTypeComposer,
  ComposeInputType,
  Directive,
  InputTypeComposer,
  isSomeInputTypeComposer,
  ListComposer,
  ObjectTypeComposer,
  SchemaComposer,
  UnionTypeComposer,
} from 'graphql-compose';
import { Logger } from '@graphql-mesh/types';
import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { ResolveRootDirective, StatusCodeTypeNameDirective } from './directives.js';
import { TypeComposers } from './getComposerFromJSONSchema.js';

export interface GetUnionTypeComposersOpts {
  schemaComposer: SchemaComposer;
  typeComposersList: {
    input?: AnyTypeComposer<any>;
    output?: ObjectTypeComposer | UnionTypeComposer;
  }[];
  subSchemaAndTypeComposers: JSONSchemaObject & TypeComposers;
  logger: Logger;
}

export function getContainerTC(schemaComposer: SchemaComposer, output: ComposeInputType) {
  const containerTypeName = `${output.getTypeName()}_container`;
  schemaComposer.addDirective(ResolveRootDirective);
  return schemaComposer.getOrCreateOTC(containerTypeName, otc =>
    otc.addFields({
      [output.getTypeName()]: {
        type: output as any,
        directives: [
          {
            name: 'resolveRoot',
          },
        ],
      },
    }),
  );
}

export function getListContainerTC(schemaComposer: SchemaComposer, output: ListComposer) {
  const containerTypeName = `${output.ofType.getTypeName()}_list`;
  return schemaComposer.getOrCreateOTC(containerTypeName, otc =>
    otc.addFields({
      items: {
        type: output as any,
      },
    }),
  );
}

export function getUnionTypeComposers({
  schemaComposer,
  typeComposersList,
  subSchemaAndTypeComposers,
  logger,
}: GetUnionTypeComposersOpts) {
  if (new Set(typeComposersList).size === 1) {
    return typeComposersList[0];
  }
  const unionInputFields: Record<string, any> = {};
  const outputTypeComposers: (ObjectTypeComposer<any> | UnionTypeComposer<any>)[] = [];
  typeComposersList.forEach(typeComposers => {
    const { input, output } = typeComposers;
    if (output instanceof ListComposer) {
      outputTypeComposers.push(getListContainerTC(schemaComposer, output));
    } else if (isSomeInputTypeComposer(output)) {
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
  }

  if (new Set(outputTypeComposers).size === 1) {
    subSchemaAndTypeComposers.output = outputTypeComposers[0];
  } else {
    const directives: Directive[] =
      (subSchemaAndTypeComposers.output as UnionTypeComposer).getDirectives() || [];
    const statusCodeOneOfIndexMap = (
      subSchemaAndTypeComposers.output as UnionTypeComposer
    ).getExtension('statusCodeOneOfIndexMap');
    const statusCodeOneOfIndexMapEntries = Object.entries(statusCodeOneOfIndexMap || {});
    for (const outputTypeComposerIndex in outputTypeComposers) {
      const outputTypeComposer = outputTypeComposers[outputTypeComposerIndex];
      const statusCode = statusCodeOneOfIndexMapEntries.find(
        ([statusCode, index]) => index.toString() === outputTypeComposerIndex.toString(),
      )?.[0];
      if ('getFields' in outputTypeComposer) {
        if (statusCode != null) {
          schemaComposer.addDirective(StatusCodeTypeNameDirective);
          directives.push({
            name: 'statusCodeTypeName',
            args: {
              statusCode,
              typeName: outputTypeComposer.getTypeName(),
            },
          });
        }
        (subSchemaAndTypeComposers.output as UnionTypeComposer).addType(outputTypeComposer);
      } else {
        for (const possibleType of outputTypeComposer.getTypes()) {
          (subSchemaAndTypeComposers.output as UnionTypeComposer).addType(possibleType);
        }
      }
    }
    (subSchemaAndTypeComposers.output as UnionTypeComposer).setDirectives(directives);
  }

  return {
    input: subSchemaAndTypeComposers.input as InputTypeComposer,
    output: subSchemaAndTypeComposers.output as UnionTypeComposer,
    nullable: subSchemaAndTypeComposers.nullable,
    readOnly: subSchemaAndTypeComposers.readOnly,
    writeOnly: subSchemaAndTypeComposers.writeOnly,
  };
}
