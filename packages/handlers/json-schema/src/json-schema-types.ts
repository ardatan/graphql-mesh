export type JSONSchemaDefinition
    = JSONSchemaArrayDefinition |
    JSONSchemaBooleanDefinition |
    JSONSchemaIntegerDefinition |
    JSONSchemaNumberDefinition |
    JSONSchemaStringDefinition |
    JSONSchemaEnumDefinition |
    JSONSchemaUntypedUnnamedObjectDefinition |
    JSONSchemaTypedNamedObjectDefinition |
    JSONSchemaTypedUnnamedObjectDefinition |
    JSONSchemaObjectReference |
    JSONSchemaAnyDefinition;

export interface JSONSchemaArrayDefinition {
    type: 'array';
    description?: string;
    items: JSONSchemaDefinition;
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
}

export interface JSONSchemaStringDefinition {
    type: 'string';
    description?: string;
}

export interface JSONSchemaEnumDefinition {
    type: 'string';
    description?: string;
    enum: string[];
}

export interface JSONSchemaTypedUnnamedObjectDefinition {
    type: 'object';
    id: string;
    description?: string;
    properties: { [propertyName: string]: JSONSchemaDefinition };
}

export interface JSONSchemaTypedNamedObjectDefinition {
    type: 'object';
    name: string;
    description?: string;
    properties: { [propertyName: string]: JSONSchemaDefinition };
}

export interface JSONSchemaUntypedUnnamedObjectDefinition {
    type: 'object';
    description?: string;
    additionalProperties?: JSONSchemaDefinition;
}

export interface JSONSchemaObjectReference {
    type: 'object';
    description?: string;
    $ref: string;
}

export interface JSONSchemaAnyDefinition {
    type: 'any';
    description?: string;
}