import {
  InterfaceTypeComposer,
  isSomeInputTypeComposer,
  ListComposer,
  ObjectTypeComposer,
  UnionTypeComposer,
  type AnyTypeComposer,
  type ComposeInputType,
  type Directive,
  type InputTypeComposer,
  type SchemaComposer,
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

  // Use local variables to avoid direct property assignment on subSchemaAndTypeComposers,
  // which may have getter-only input/output properties (e.g. when it originates from an
  // array schema processed by the enter visitor). Assigning to a getter-only property
  // throws a TypeError in strict mode (Node.js 25+).
  let resolvedInput = subSchemaAndTypeComposers.input;
  let resolvedOutput = subSchemaAndTypeComposers.output;

  if (Object.keys(unionInputFields).length === 1) {
    resolvedInput = Object.values(unionInputFields)[0].type;
  } else {
    // For array+oneOf schemas, resolvedInput may be a ListComposer (getter-only); unwrap it
    // so addFields is called on the underlying InputObjectTypeComposer.
    const inputTC = resolvedInput instanceof ListComposer
      ? (resolvedInput.getUnwrappedTC() as InputTypeComposer)
      : (resolvedInput as InputTypeComposer);
    inputTC.addFields(unionInputFields);
    resolvedInput = inputTC;
  }

  if (new Set(outputTypeComposers).size === 1) {
    resolvedOutput = outputTypeComposers[0];
  } else {
    // For array+oneOf schemas, resolvedOutput may be a ListComposer (getter-only). Unwrap it
    // to find the underlying UnionTypeComposer, or create one if the inner type is not a union.
    let unionOutputTC: UnionTypeComposer<any>;
    if (resolvedOutput instanceof ListComposer) {
      const innerTC = resolvedOutput.getUnwrappedTC();
      unionOutputTC = innerTC instanceof UnionTypeComposer
        ? innerTC
        : schemaComposer.createUnionTC({ name: innerTC.getTypeName() + '_union', types: [] });
    } else {
      unionOutputTC = resolvedOutput as UnionTypeComposer;
    }
    const directives: Directive[] = unionOutputTC.getDirectives() || [];
    const statusCodeOneOfIndexMap = unionOutputTC.getExtension(
      'statusCodeOneOfIndexMap',
    );
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
              unionOutputTC.addType(tc);
            }
          });
        } else {
          unionOutputTC.addType(outputTypeComposer);
        }
      } else {
        for (const possibleType of outputTypeComposer.getTypes()) {
          unionOutputTC.addType(possibleType);
        }
      }
    }
    unionOutputTC.setDirectives(directives);
    resolvedOutput = unionOutputTC;
  }

  let flatten = false;
  // TODO: container suffix might not be coming from us
  if ((resolvedOutput as ObjectTypeComposer).getTypeName().endsWith('_container')) {
    const fields = (resolvedOutput as ObjectTypeComposer).getFields();
    const fieldKeys = Object.keys(fields);
    if (fieldKeys.length === 1) {
      resolvedOutput = fields[fieldKeys[0]].type;
      flatten = isOutputPlural;
    }
  }

  return {
    input: resolvedInput as InputTypeComposer,
    output: isOutputPlural
      ? ((resolvedOutput as UnionTypeComposer).List as ListComposer)
      : (resolvedOutput as UnionTypeComposer),
    nullable: subSchemaAndTypeComposers.nullable,
    readOnly: subSchemaAndTypeComposers.readOnly,
    writeOnly: subSchemaAndTypeComposers.writeOnly,
    flatten,
  };
}
