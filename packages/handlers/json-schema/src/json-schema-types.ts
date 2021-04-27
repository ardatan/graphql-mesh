export type JSONSchemaDefinition = JSONSchemaRootDefinition | JSONSchemaNonRootDefinition;

export type JSONSchemaNonRootDefinition =
  | JSONSchemaArrayDefinition
  | JSONSchemaBooleanDefinition
  | JSONSchemaIntegerDefinition
  | JSONSchemaNumberDefinition
  | JSONSchemaStringDefinition
  | JSONSchemaEnumDefinition
  | JSONSchemaUntypedUnnamedObjectDefinition
  | JSONSchemaTypedNamedObjectDefinition
  | JSONSchemaTypedUnnamedObjectDefinition
  | JSONSchemaObjectReference
  | JSONSchemaAnyDefinition
  | JSONSchemaNullDefinition;

export type JSONSchemaRootDefinition = (
  | {
      definitions: { [name: string]: JSONSchemaDefinition };
    }
  | { $defs: { [name: string]: JSONSchemaDefinition } }
) &
  JSONSchemaNonRootDefinition;

export interface JSONSchemaArrayDefinition {
  type: 'array';
  description?: string;
  items: JSONSchemaDefinition | JSONSchemaDefinition[];
}

export interface JSONSchemaBooleanDefinition {
  type: 'boolean';
  description?: string;
}

export interface JSONSchemaIntegerDefinition {
  type: 'integer';
  description?: string;
}

export interface JSONSchemaNumberDefinition {
  type: 'number';
  description?: string;
  pattern?: string;
  format?: string;
}

export interface JSONSchemaStringDefinition {
  type: 'string';
  description?: string;
  format?: string;
  pattern?: string;
}

export type JSONSchemaEnumDefinition = JSONSchemaNamedEnumDefinition | JSONSchemaUnnamedEnumDefinition;

export interface JSONSchemaNamedEnumDefinition {
  type: 'string';
  description?: string;
  enum: string[];
}

export type JSONSchemaUnnamedEnumDefinition =
  | {
      type: 'string';
      title: string;
      description?: string;
      enum: string[];
    }
  | {
      type: 'string';
      name: string;
      description?: string;
      enum: string[];
    };

export type JSONSchemaTypedUnnamedObjectDefinition = {
  type: 'object';
  description?: string;
  properties?: { [propertyName: string]: JSONSchemaDefinition };
  required?: string[];
} & ({ $id: string } | { id: string });

export type JSONSchemaTypedNamedObjectDefinition =
  | {
      type: 'object';
      name: string;
      description?: string;
      properties?: { [propertyName: string]: JSONSchemaDefinition };
    }
  | {
      type: 'object';
      title: string;
      description?: string;
      properties?: { [propertyName: string]: JSONSchemaDefinition };
    };

export interface JSONSchemaUntypedUnnamedObjectDefinition {
  type: 'object';
  description?: string;
  additionalProperties?: JSONSchemaDefinition;
}

export type JSONSchemaTypedObjectDefinition =
  | JSONSchemaTypedUnnamedObjectDefinition
  | JSONSchemaTypedNamedObjectDefinition;

export interface JSONSchemaObjectReference {
  type: 'object';
  description?: string;
  $ref: string;
}

export interface JSONSchemaAnyDefinition {
  type: 'any';
  description?: string;
}

export interface JSONSchemaNullDefinition {
  type: 'null';
  description?: string;
}

export interface JSONSchemaOneOfDefinition {
  title?: string;
  discriminator?: { propertyName: string; mapping: Record<string, string> };
  oneOf: JSONSchemaNonRootDefinition[];
}

export interface JSONSchemaConstDefinition {
  const: string;
  description?: string;
}
