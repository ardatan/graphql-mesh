import {
  JSONSchemaDefinition,
  JSONSchemaArrayDefinition,
  JSONSchemaObjectReference,
  JSONSchemaEnumDefinition,
  JSONSchemaTypedUnnamedObjectDefinition,
  JSONSchemaTypedNamedObjectDefinition,
  JSONSchemaTypedObjectDefinition,
} from './json-schema-types';
import { SchemaComposer } from 'graphql-compose';
import { pascalCase } from 'pascal-case';

const asArray = <T>(maybeArray: T | T[]): T[] => {
  if (Array.isArray(maybeArray)) {
    return maybeArray;
  } else if (maybeArray) {
    return [maybeArray];
  } else {
    return [];
  }
};

const invalidSeperators = [':', '>', '<', '.'];
function createName(ref: string) {
  ref = ref.split('/').pop();
  for (const sep of invalidSeperators) {
    ref = ref.split(sep).join('_');
  }
  return pascalCase(ref);
}

export class JSONSchemaVisitor<TContext> {
  constructor(private schemaComposer: SchemaComposer<TContext>, private isInput: boolean) {}

  visit(def: JSONSchemaDefinition, propertyName: string, prefix: string) {
    if ('definitions' in def) {
      for (const propertyName in def.definitions) {
        const definition = def.definitions[propertyName];
        this.visit(definition, propertyName, prefix);
      }
    }
    if ('$defs' in def) {
      for (const propertyName in def.$defs) {
        const definition = def.$defs[propertyName];
        this.visit(definition, propertyName, prefix);
      }
    }
    switch (def.type) {
      case 'array':
        return this.visitArray(def, propertyName, prefix);
      case 'boolean':
        return this.visitBoolean();
      case 'integer':
        return this.visitInteger();
      case 'number':
        return this.visitNumber();
      case 'string':
        if ('enum' in def) {
          return this.visitEnum(def, propertyName, prefix);
        } else {
          return this.visitString();
        }
      case 'null':
      case 'any':
        return this.visitAny();
      case 'object':
        if ('name' in def || 'title' in def) {
          return this.visitTypedNamedObjectDefinition(def, prefix);
        } else if ('properties' in def) {
          return this.visitTypedUnnamedObjectDefinition(def, propertyName, prefix);
        } else if ('additionalProperties' in def && def.additionalProperties) {
          return this.visitAny();
        }
    }
    if ('$ref' in def) {
      return this.visitObjectReference(def);
    }
    throw new Error(`Unexpected schema definition:
        ${JSON.stringify(def, null, 2)}`);
  }

  visitArray(arrayDef: JSONSchemaArrayDefinition, propertyName: string, prefix: string) {
    const [itemsDef] = asArray(arrayDef.items);
    let itemTypeName = 'JSON';
    if (itemsDef) {
      itemTypeName = this.visit(itemsDef, propertyName, prefix);
    }
    return `[${itemTypeName}]`;
  }

  visitBoolean() {
    return 'Boolean';
  }

  visitInteger() {
    return 'Int';
  }

  visitNumber() {
    return 'Float';
  }

  visitString() {
    return 'String';
  }

  visitEnum(enumDef: JSONSchemaEnumDefinition, propertyName: string, prefix: string) {
    const name = createName([propertyName, prefix].join('_'));
    const enumTC = this.schemaComposer.createEnumTC({
      name,
    });
    for (const enumValue of enumDef.enum) {
      const enumKey = createName(enumValue);
      enumTC.addFields({
        [enumKey]: {
          value: enumValue,
        },
      });
    }
    return name;
  }

  private createFieldsMapFromProperties(objectDef: JSONSchemaTypedObjectDefinition, prefix: string) {
    const fieldMap: Record<
      string,
      {
        type: string;
        description?: string;
        resolve?: (root: any) => any;
      }
    > = {};
    for (const propertyName in objectDef.properties) {
      const fieldName = propertyName.split(':').join('_');
      const property = objectDef.properties[propertyName];
      let type = this.visit(property, propertyName, prefix);
      const isRequired = 'required' in objectDef && objectDef.required?.includes(propertyName);
      if (isRequired) {
        type += '!';
      }
      fieldMap[fieldName] = {
        type,
        description: property.description,
      };
      if (this.isInput && fieldName !== propertyName) {
        fieldMap[fieldName].resolve = (root: any) => root[propertyName];
      }
    }
    return fieldMap;
  }

  private getGraphQLObjectTypeWithTypedObjectDef(objectDef: JSONSchemaTypedObjectDefinition, objectIdentifier: string) {
    let name = createName(objectIdentifier);
    const fields = this.createFieldsMapFromProperties(objectDef, name);
    if (this.isInput) {
      name += 'Input';
      this.schemaComposer.createInputTC({
        name,
        fields,
      });
    } else {
      this.schemaComposer.createObjectTC({
        name,
        fields,
      });
    }
    return name;
  }

  visitTypedUnnamedObjectDefinition(
    typedUnnamedObjectDef: JSONSchemaTypedUnnamedObjectDefinition,
    propertyName: string,
    prefix: string
  ) {
    return this.getGraphQLObjectTypeWithTypedObjectDef(typedUnnamedObjectDef, prefix + '_' + propertyName);
  }

  visitTypedNamedObjectDefinition(typedNamedObjectDef: JSONSchemaTypedNamedObjectDefinition, prefix: string) {
    const objectIdentifier = 'name' in typedNamedObjectDef ? typedNamedObjectDef.name : typedNamedObjectDef.title;
    return this.getGraphQLObjectTypeWithTypedObjectDef(typedNamedObjectDef, objectIdentifier);
  }

  visitObjectReference(objectRef: JSONSchemaObjectReference) {
    return createName(objectRef.$ref);
  }

  visitAny() {
    return 'JSON';
  }
}
