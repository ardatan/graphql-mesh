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
  subgraphName: string;
  schemaComposer: SchemaComposer;
  typeComposersList: {
    input?: AnyTypeComposer<any>;
    output?: ObjectTypeComposer | UnionTypeComposer;
  }[];
  subSchemaAndTypeComposers: JSONSchemaObject & TypeComposers;
  logger: Logger;
}

export function getContainerTC(
  subgraphName: string,
  schemaComposer: SchemaComposer,
  output: ComposeInputType,
) {
  const containerTypeName = `${output.getTypeName().split('!').join('')}_container`;
  schemaComposer.addDirective(ResolveRootDirective);
  return schemaComposer.getOrCreateOTC(containerTypeName, otc =>
    otc.addFields({
      [output.getTypeName()]: {
        type: output as any,
        directives: [
          {
            name: 'resolveRoot',
            args: {
              subgraph: subgraphName,
            },
          },
        ],
      },
    }),
  );
}

export function getUnionTypeComposers({
  subgraphName,
  schemaComposer,
  typeComposersList,
  subSchemaAndTypeComposers,
  logger,
}: GetUnionTypeComposersOpts): TypeComposers {
  if (new Set(typeComposersList).size === 1) {
    return typeComposersList[0] as TypeComposers;
  }
  const unionInputFields: Record<string, any> = {};
  const outputTypeComposers: (ObjectTypeComposer<any> | UnionTypeComposer<any>)[] = [];
  let isOutputPlural = false;
  typeComposersList.forEach(typeComposers => {
    let { input, output } = typeComposers;
    while ((output as any).ofType) {
      if (!isOutputPlural) {
        isOutputPlural = output instanceof ListComposer;
      }
      output = (output as any).ofType;
    }
    if (isSomeInputTypeComposer(output)) {
      outputTypeComposers.push(getContainerTC(subgraphName, schemaComposer, output));
    } else {
      outputTypeComposers.push(output);
    }
    if (input) {
      let isInputPlural = false;
      while ((input as any).ofType) {
        if (!isInputPlural) {
          isInputPlural = input instanceof ListComposer;
        }
        input = (input as any).ofType;
      }
      const inputTypeName = input.getTypeName();
      const fieldName = isInputPlural ? inputTypeName + '_list' : inputTypeName;
      unionInputFields[fieldName] = {
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
      let outputTypeComposer = outputTypeComposers[outputTypeComposerIndex];
      while ((outputTypeComposer as any).ofType) {
        outputTypeComposer = (outputTypeComposer as any).ofType as
          | ObjectTypeComposer
          | UnionTypeComposer;
      }
      const statusCode = statusCodeOneOfIndexMapEntries.find(
        ([statusCode, index]) => index.toString() === outputTypeComposerIndex.toString(),
      )?.[0];
      if ('getFields' in outputTypeComposer) {
        if (statusCode != null) {
          schemaComposer.addDirective(StatusCodeTypeNameDirective);
          directives.push({
            name: 'statusCodeTypeName',
            args: {
              subgraph: subgraphName,
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

  let flatten = false;
  // TODO: container suffix might not be coming from us
  if (
    (subSchemaAndTypeComposers.output as ObjectTypeComposer).getTypeName().endsWith('_container')
  ) {
    const fields = (subSchemaAndTypeComposers.output as ObjectTypeComposer).getFields();
    const fieldKeys = Object.keys(fields);
    if (fieldKeys.length === 1) {
      subSchemaAndTypeComposers.output = fields[fieldKeys[0]].type;
      flatten = isOutputPlural;
    }
  }

  return {
    input: subSchemaAndTypeComposers.input as InputTypeComposer,
    output: isOutputPlural
      ? ((subSchemaAndTypeComposers.output as UnionTypeComposer).List as ListComposer)
      : (subSchemaAndTypeComposers.output as UnionTypeComposer),
    nullable: subSchemaAndTypeComposers.nullable,
    readOnly: subSchemaAndTypeComposers.readOnly,
    writeOnly: subSchemaAndTypeComposers.writeOnly,
    flatten,
  };
}
