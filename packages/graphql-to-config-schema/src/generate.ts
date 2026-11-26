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
  type NamedTypeNode,
  type TypeNode,
} from 'graphql';
import type { JSONSchema4 } from 'json-schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

export function generateFromSchema(schema: GraphQLSchema, rootType = 'Query'): JSONSchema4 {
  // Prefer printSchemaWithDirectives so @md / @withAdditionalProperties survive.
  const documentNode = parse(printSchemaWithDirectives(schema));
  const jsonSchema: JSONSchema4 = {
    definitions: {},
    title: 'Config',
    type: 'object',
    $schema: 'http://json-schema.org/draft-04/schema#',
  };

  visit(documentNode, {
    ObjectTypeDefinition(node) {
      if (node.name.value === rootType) {
        const required = (node.fields || [])
          .filter(f => f.type.kind === Kind.NON_NULL_TYPE)
          .map(f => f.name.value);

        if (required.length) {
          jsonSchema.required = required;
        }

        jsonSchema.properties = buildPropertiesFromFields(schema, node.fields || []);
        jsonSchema.additionalProperties = false;
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

        // GraphQL 17 may omit empty `directives`; treat missing as [].
        const allowAdditional = (node.directives || []).some(
          d => d.name.value === 'withAdditionalProperties',
        );

        jsonSchema.definitions[node.name.value] = {
          additionalProperties: allowAdditional,
          type: 'object',
          title: node.name.value,
          properties: buildPropertiesFromFields(schema, node.fields || []),
          ...additional,
        };
      }
    },
  });

  return jsonSchema;
}

function buildPropertiesFromFields(
  schema: GraphQLSchema,
  fields: ReadonlyArray<FieldDefinitionNode>,
): Record<string, JSONSchema4> {
  return fields.reduce(
    (prev, field) => {
      const namedType = getBaseTypeNode(field.type);
      const typeToUse = getTypeToUse(schema, namedType.name.value);
      const isArrayField = isArray(field.type);
      // Match historical `@ardatan/graphql-to-config-schema@0.1.25` behavior
      // (`if (!isArray)` checked the function object and was always false).
      const fieldDef: JSONSchema4 = isArrayField
        ? { type: 'array', items: typeToUse, additionalItems: false }
        : { ...typeToUse };
      fieldDef.description = typeToUse.description;

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

function getBaseTypeNode(typeNode: TypeNode): NamedTypeNode {
  if (typeNode.kind === Kind.LIST_TYPE || typeNode.kind === Kind.NON_NULL_TYPE) {
    return getBaseTypeNode(typeNode.type);
  }
  return typeNode;
}

function isArray(typeNode: TypeNode): boolean {
  if (typeNode.kind === Kind.NON_NULL_TYPE) {
    return isArray(typeNode.type);
  }
  if (typeNode.kind === Kind.LIST_TYPE) {
    return true;
  }
  return false;
}

const SCALARS: Record<string, string> = {
  String: 'string',
  ID: 'string',
  Boolean: 'boolean',
  Float: 'number',
  Int: 'integer',
  JSON: 'object',
};

function getTypeToUse(schema: GraphQLSchema, typeName: string): JSONSchema4 {
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
    const values = schemaType.getValues().map(v => v.value);
    return {
      type: 'string',
      enum: values,
      description: `Allowed values: ${values.join(', ')}`,
    };
  }

  if (isObjectType(schemaType)) {
    return {
      $ref: `#/definitions/${schemaType.name}`,
    };
  }

  if (isInterfaceType(schemaType)) {
    const types = getImplementingTypes(schema, schemaType);
    return {
      description: `Any of: ${types.join(', ')}`,
      anyOf: types.map(t => getTypeToUse(schema, t)),
    };
  }

  if (isUnionType(schemaType)) {
    const types = schemaType.getTypes();
    return {
      description: `Any of: ${types.map(t => t.name).join(', ')}`,
      anyOf: types.map(t => getTypeToUse(schema, t.name)),
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
