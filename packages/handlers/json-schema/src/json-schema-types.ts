export type JSONSchemaDefinition
    = JSONSchemaRootDefinition | JSONSchemaNonRootDefinition;

export type JSONSchemaNonRootDefinition = 
JSONSchemaArrayDefinition |
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

export type JSONSchemaRootDefinition = ({
    definitions: {[name :string]: JSONSchemaDefinition};
} | { $defs: {[name :string]: JSONSchemaDefinition} }) & JSONSchemaNonRootDefinition;

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

export type JSONSchemaTypedUnnamedObjectDefinition = {
    type: 'object';
    description?: string;
    properties?: { [propertyName: string]: JSONSchemaDefinition };
    required?: string[];
} & ({ $id: string; } | { id: string })

export interface JSONSchemaTypedNamedObjectDefinition {
    type: 'object';
    name: string;
    description?: string;
    properties?: { [propertyName: string]: JSONSchemaDefinition };
}

export interface JSONSchemaUntypedUnnamedObjectDefinition {
    type: 'object';
    description?: string;
    additionalProperties?: JSONSchemaDefinition;
}

export type JSONSchemaTypedObjectDefinition = JSONSchemaTypedUnnamedObjectDefinition | JSONSchemaTypedNamedObjectDefinition;

export interface JSONSchemaObjectReference {
    type: 'object';
    description?: string;
    $ref: string;
}

export interface JSONSchemaAnyDefinition {
    type: 'any';
    description?: string;
}