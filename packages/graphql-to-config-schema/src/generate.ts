import {
  GraphQLObjectType,
  isEnumType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
  Kind,
  parse,
  visit,
  type FieldDefinitionNode,
  type GraphQLInterfaceType,
  type GraphQLSchema,
  type TypeNode,
} from 'graphql';
import type { JSONSchema4 } from 'json-schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

export function generateFromSchema(schema: GraphQLSchema, rootType = 'Query'): JSONSchema4 {
  const rootGraphqlType = schema.getType(rootType);
  if (!isObjectType(rootGraphqlType)) {
    throw new Error(`rootType "${rootType}" must name an object type in the GraphQL schema`);
  }

  // Prefer printSchemaWithDirectives so @md / @withAdditionalProperties survive.
  const documentNode = parse(printSchemaWithDirectives(schema));
  const jsonSchema: JSONSchema4 = {
    definitions: {},
    title: 'Config',
    type: 'object',
    $schema: 'http://json-schema.org/draft-04/schema#',
  };

  let sawRoot = false;
  visit(documentNode, {
    ObjectTypeDefinition(node) {
      if (node.name.value === rootType) {
        sawRoot = true;
        const required = (node.fields || [])
          .filter(f => f.type.kind === Kind.NON_NULL_TYPE)
          .map(f => f.name.value);

        if (required.length) {
          jsonSchema.required = required;
        }

        jsonSchema.properties = buildPropertiesFromFields(schema, node.fields || [], rootType);
        // GraphQL 17 may omit empty `directives`; treat missing as [].
        const allowAdditional = (node.directives || []).some(
          d => d.name.value === 'withAdditionalProperties',
        );
        jsonSchema.additionalProperties = allowAdditional;
        // Root may be referenced by fields (`type Query { child: Query }`).
        if (jsonSchema.definitions) {
          jsonSchema.definitions[rootType] = {
            additionalProperties: allowAdditional,
            type: 'object',
            title: rootType,
            properties: jsonSchema.properties,
            ...(required.length ? { required } : {}),
          };
        }
        return;
      }

      if (jsonSchema.definitions) {
        const additional: JSONSchema4 = {};
        const required = (node.fields || [])
          .filter(f => f.type.kind === Kind.NON_NULL_TYPE)
          .map(f => f.name.value);

        if (required.length) {
          additional.required = required;
        }

        const allowAdditional = (node.directives || []).some(
          d => d.name.value === 'withAdditionalProperties',
        );

        jsonSchema.definitions[node.name.value] = {
          additionalProperties: allowAdditional,
          type: 'object',
          title: node.name.value,
          properties: buildPropertiesFromFields(schema, node.fields || [], rootType),
          ...additional,
        };
      }
    },
  });

  if (!sawRoot) {
    throw new Error(`rootType "${rootType}" must name an object type in the GraphQL schema`);
  }

  return jsonSchema;
}

function buildPropertiesFromFields(
  schema: GraphQLSchema,
  fields: ReadonlyArray<FieldDefinitionNode>,
  rootType: string,
): Record<string, JSONSchema4> {
  return fields.reduce(
    (prev, field) => {
      const fieldDef = typeNodeToJsonSchema(schema, field.type, rootType);
      // Lift named-type description onto list fields (historical config-schema behavior).
      if (!fieldDef.description) {
        let namedNode = field.type;
        while (namedNode.kind === Kind.NON_NULL_TYPE || namedNode.kind === Kind.LIST_TYPE) {
          namedNode = namedNode.type;
        }
        const namedDesc = getTypeToUse(schema, namedNode.name.value, rootType).description;
        if (namedDesc) {
          fieldDef.description = namedDesc;
        }
      }

      if (field.description?.value) {
        if (fieldDef.description) {
          fieldDef.description = `${field.description.value} (${fieldDef.description})`;
        } else {
          fieldDef.description = field.description.value;
        }
      }

      return {
        ...prev,
        [field.name.value]: fieldDef,
      };
    },
    {} as Record<string, JSONSchema4>,
  );
}

/** Recursively emit an `items` schema for every list wrapper (`[[Int]]` → nested arrays). */
function typeNodeToJsonSchema(
  schema: GraphQLSchema,
  typeNode: TypeNode,
  rootType: string,
): JSONSchema4 {
  if (typeNode.kind === Kind.NON_NULL_TYPE) {
    return typeNodeToJsonSchema(schema, typeNode.type, rootType);
  }
  if (typeNode.kind === Kind.LIST_TYPE) {
    return {
      type: 'array',
      items: typeNodeToJsonSchema(schema, typeNode.type, rootType),
      additionalItems: false,
    };
  }
  return getTypeToUse(schema, typeNode.name.value, rootType);
}

const SCALARS: Record<string, string> = {
  String: 'string',
  ID: 'string',
  Boolean: 'boolean',
  Float: 'number',
  Int: 'integer',
  JSON: 'object',
};

function getTypeToUse(schema: GraphQLSchema, typeName: string, rootType: string): JSONSchema4 {
  const schemaType = schema.getType(typeName);

  if (isScalarType(schemaType) && SCALARS[schemaType.name]) {
    const scalar = SCALARS[schemaType.name] as JSONSchema4['type'];
    if (scalar === 'object') {
      return {
        type: scalar,
        properties: {},
      };
    }
    return {
      type: scalar,
    };
  }

  if (isEnumType(schemaType)) {
    // JSON Schema consumers send external GraphQL enum names, not internal values.
    const values = schemaType.getValues().map(v => v.name);
    return {
      type: 'string',
      enum: values,
      description: `Allowed values: ${values.join(', ')}`,
    };
  }

  if (isObjectType(schemaType)) {
    // Root self-refs and non-root objects both resolve via definitions (root is registered).
    return {
      $ref: `#/definitions/${schemaType.name}`,
    };
  }

  if (isInterfaceType(schemaType)) {
    const types = getImplementingTypes(schema, schemaType);
    if (types.length === 0) {
      // Draft-04: empty anyOf is invalid; emit an unsatisfiable schema.
      return {
        description: `Interface ${schemaType.name} has no implementing object types`,
        not: {},
      };
    }
    return {
      description: `Any of: ${types.join(', ')}`,
      anyOf: types.map(t => getTypeToUse(schema, t, rootType)),
    };
  }

  if (isUnionType(schemaType)) {
    const types = schemaType.getTypes();
    return {
      description: `Any of: ${types.map(t => t.name).join(', ')}`,
      anyOf: types.map(t => getTypeToUse(schema, t.name, rootType)),
    };
  }

  // Fallback used for Mesh's `Any` scalar / unknown types.
  return {
    anyOf: [
      {
        type: 'object',
        additionalProperties: true,
      },
      {
        type: 'string',
      },
      {
        type: 'array',
        additionalItems: true,
      },
    ],
  };
}

function getImplementingTypes(schema: GraphQLSchema, type: GraphQLInterfaceType): string[] {
  const implementingTypes: string[] = [];
  for (const graphqlType of Object.values(schema.getTypeMap())) {
    if (graphqlType instanceof GraphQLObjectType) {
      if (graphqlType.getInterfaces().some(intf => intf.name === type.name)) {
        implementingTypes.push(graphqlType.name);
      }
    }
  }
  return implementingTypes;
}
