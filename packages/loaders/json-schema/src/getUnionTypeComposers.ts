import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import Ajv from 'ajv';
import {
  AnyTypeComposer,
  isSomeInputTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfig,
  ObjectTypeComposerThunked,
  SchemaComposer,
  UnionTypeComposer,
} from 'graphql-compose';
import { getTypeResolverFromOutputTCs } from './getTypeResolverFromOutputTCs';
import { getValidTypeName } from './getValidTypeName';

const ONE_OF_DEFINITION = /* GraphQL */ `
  directive @oneOf on INPUT_OBJECT | FIELD_DEFINITION
`;

export interface GetUnionTypeComposersOpts {
  schemaComposer: SchemaComposer;
  ajv: Ajv;
  typeComposersList: { input?: AnyTypeComposer<any>; output?: ObjectTypeComposer | UnionTypeComposer }[];
  subSchema: JSONSchemaObject;
  generateInterfaceFromSharedFields: boolean;
  statusCodeOneOfIndexMap?: Record<string, number>;
}

export function getUnionTypeComposers({
  schemaComposer,
  ajv,
  typeComposersList,
  subSchema,
  generateInterfaceFromSharedFields,
  statusCodeOneOfIndexMap,
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
    unionInputFields[input.getTypeName()] = {
      type: input,
    };
  });
  const input = schemaComposer.createInputTC({
    name: getValidTypeName({
      schemaComposer,
      isInput: true,
      subSchema,
    }),
    description: subSchema.description,
    fields: unionInputFields,
  });
  if (!schemaComposer.hasDirective('oneOf')) {
    schemaComposer.addTypeDefs(ONE_OF_DEFINITION);
  }
  input.setDirectives([
    {
      name: 'oneOf',
      args: {},
    },
  ]);

  let output: AnyTypeComposer<any>;
  let sharedFields: Record<string, ObjectTypeComposerFieldConfig<any, any, any>>;
  if (generateInterfaceFromSharedFields) {
    for (const typeComposer of outputTypeComposers) {
      const fieldMap = (typeComposer as any).getFields();
      if (!sharedFields) {
        sharedFields = { ...fieldMap };
      } else {
        for (const potentialSharedFieldName in sharedFields) {
          if (
            !(
              potentialSharedFieldName in fieldMap &&
              fieldMap[potentialSharedFieldName].type.getTypeName() ===
                sharedFields[potentialSharedFieldName].type.getTypeName()
            )
          ) {
            sharedFields[potentialSharedFieldName] = undefined;
            delete sharedFields[potentialSharedFieldName];
          }
        }
      }
    }
  }

  const resolveType = getTypeResolverFromOutputTCs(ajv, outputTypeComposers, statusCodeOneOfIndexMap);
  if (sharedFields && Object.keys(sharedFields).length > 0) {
    output = schemaComposer.createInterfaceTC({
      name: getValidTypeName({
        schemaComposer,
        isInput: false,
        subSchema,
      }),
      description: subSchema.description,
      fields: sharedFields,
      resolveType,
      extensions: {
        statusCodeOneOfIndexMap,
      },
    });
    for (const typeComposer of outputTypeComposers) {
      (typeComposer as any).addInterface(output);
      // GraphQL removes implementations
      schemaComposer.addSchemaMustHaveType(typeComposer);
    }
  } else {
    // If no shared fields found
    output = schemaComposer.createUnionTC({
      name: getValidTypeName({
        schemaComposer,
        isInput: false,
        subSchema,
      }),
      description: subSchema.description,
      types: () => {
        const possibleTypes: ObjectTypeComposerThunked<any, any>[] = [];
        for (const outputTypeComposer of outputTypeComposers) {
          if ('getFields' in outputTypeComposer) {
            possibleTypes.push(outputTypeComposer);
          } else {
            for (const possibleType of outputTypeComposer.getTypes()) {
              possibleTypes.push(possibleType);
            }
          }
        }
        return possibleTypes;
      },
      resolveType,
      extensions: {
        statusCodeOneOfIndexMap,
      },
    });
  }

  return {
    input,
    output,
  };
}
