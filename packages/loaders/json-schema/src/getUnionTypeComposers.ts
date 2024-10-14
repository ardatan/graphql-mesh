import {
  InterfaceTypeComposer,
  isSomeInputTypeComposer,
  ListComposer,
  ObjectTypeComposer,
  type AnyTypeComposer,
  type ComposeInputType,
  type Directive,
  type InputTypeComposer,
  type SchemaComposer,
  type UnionTypeComposer,
} from 'graphql-compose';
import type { Logger } from '@graphql-mesh/types';
import type { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { ResolveRootDirective, StatusCodeTypeNameDirective } from './directives.js';
import type { TypeComposers } from './getComposerFromJSONSchema.js';

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
  const containerTypeName = `${output.getTypeName()}_container`;
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
    if (output instanceof ListComposer) {
      output = output.getUnwrappedTC() as ObjectTypeComposer | UnionTypeComposer;
      isOutputPlural = true;
    }
    if (isSomeInputTypeComposer(output)) {
      outputTypeComposers.push(getContainerTC(subgraphName, schemaComposer, output));
    } else {
      outputTypeComposers.push(output);
    }
    if (input) {
      const inputTypeName =
        input instanceof ListComposer
          ? input.getUnwrappedTC().getTypeName() + '_list'
          : input.getTypeName();
      unionInputFields[inputTypeName] = {
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
      const a: InterfaceTypeComposer<any> = outputTypeComposer as any;
      if ('getFields' in outputTypeComposer) {
        if (statusCode != null) {
          schemaComposer.addDirective(StatusCodeTypeNameDirective);
          directives.push({
            name: 'statusCodeTypeName',
            args: {
              subgraph: subgraphName,
              statusCode: statusCode.toString(),
              typeName: outputTypeComposer.getTypeName(),
            },
          });
        }
        if (outputTypeComposer instanceof InterfaceTypeComposer) {
          schemaComposer.forEach(tc => {
            if (tc instanceof ObjectTypeComposer && tc.hasInterface(a)) {
              (subSchemaAndTypeComposers.output as UnionTypeComposer).addType(tc);
            }
          });
        } else {
          (subSchemaAndTypeComposers.output as UnionTypeComposer).addType(outputTypeComposer);
        }
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
