import {
  JSONSchemaDefinition,
  JSONSchemaArrayDefinition,
  JSONSchemaObjectReference,
  JSONSchemaEnumDefinition,
  JSONSchemaTypedUnnamedObjectDefinition,
  JSONSchemaTypedNamedObjectDefinition,
  JSONSchemaTypedObjectDefinition,
  JSONSchemaStringDefinition,
} from './json-schema-types';
import { SchemaComposer } from 'graphql-compose';
import { pascalCase } from 'pascal-case';
import { join, isAbsolute, dirname } from 'path';
import { readJSONSync } from 'fs-extra';
import { flatten } from 'lodash';

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

export const getFileName = (filePath: string) => {
  const arr = filePath.split('/').map(part => part.split('\\'));
  return flatten(arr).pop().split('.').join('_');
};

export class JSONSchemaVisitor<TContext> {
  private cache: Map<string, string>;
  constructor(private schemaComposer: SchemaComposer<TContext>, private isInput: boolean) {
    this.cache = new Map();
  }

  createName(ref: string, cwd: string) {
    let [externalPath, internalRef] = ref.split('#');
    // If a reference
    if (internalRef) {
      if (externalPath) {
        const absolutePath = isAbsolute(externalPath) ? externalPath : join(cwd, externalPath);
        const externalSchema = readJSONSync(absolutePath);
        this.visit(
          externalSchema,
          this.isInput ? 'Request' : 'Response',
          getFileName(absolutePath),
          dirname(absolutePath)
        );
      }
    } else {
      internalRef = ref;
    }
    internalRef = internalRef.split('/').pop();
    for (const sep of invalidSeperators) {
      internalRef = internalRef.split(sep).join('_');
    }
    return pascalCase(internalRef);
  }

  visit(def: JSONSchemaDefinition, propertyName: string, prefix: string, cwd: string) {
    const summary = JSON.stringify(def);
    if (this.cache.has(summary)) {
      return this.cache.get(summary);
    }
    if ('definitions' in def) {
      for (const propertyName in def.definitions) {
        const definition = def.definitions[propertyName];
        this.visit(definition, propertyName, prefix, cwd);
      }
    }
    if ('$defs' in def) {
      for (const propertyName in def.$defs) {
        const definition = def.$defs[propertyName];
        this.visit(definition, propertyName, prefix, cwd);
      }
    }
    let result: string;
    switch (def.type) {
      case 'array':
        result = this.visitArray(def, propertyName, prefix, cwd);
        break;
      case 'boolean':
        result = this.visitBoolean();
        break;
      case 'integer':
        result = this.visitInteger();
        break;
      case 'number':
        result = this.visitNumber();
        break;
      case 'string':
        if ('enum' in def) {
          result = this.visitEnum(def, propertyName, prefix, cwd);
        } else {
          result = this.visitString(def);
        }
        break;
      case 'null':
        result = this.visitNull();
        break;
      case 'any':
        result = this.visitAny();
        break;
      case 'object':
        if ('name' in def || 'title' in def) {
          result = this.visitTypedNamedObjectDefinition(def, cwd);
        } else if ('properties' in def) {
          result = this.visitTypedUnnamedObjectDefinition(def, propertyName, prefix, cwd);
        } else if ('additionalProperties' in def && def.additionalProperties) {
          result = this.visitAny();
        }
        break;
      default:
        if ('$ref' in def) {
          result = this.visitObjectReference(def, cwd);
        }
        break;
    }
    this.cache.set(summary, result);
    return result;
  }

  visitArray(arrayDef: JSONSchemaArrayDefinition, propertyName: string, prefix: string, cwd: string) {
    const [itemsDef] = asArray(arrayDef.items);
    let itemTypeName = 'JSON';
    if (itemsDef) {
      itemTypeName = this.visit(itemsDef, propertyName, prefix, cwd);
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

  visitString(stringDef: JSONSchemaStringDefinition) {
    if (stringDef.format) {
      switch (stringDef.format) {
        /*

             * * date-time
             * * date
             * * time
             * * utc-millisec
             * * color
             * * style
             * * phone
             * * uri
             * * email
             * * ip-address
             * * ipv6
        */
        case 'date-time':
          return 'DateTime';
        case 'date':
          return 'Date';
        case 'time':
          return 'Time';
        case 'utc-millisec':
          return 'Timestamp';
        case 'color':
          return 'String'; // TODO
        case 'phone':
          return 'PhoneNumber';
        case 'uri':
          return 'URL';
        case 'email':
          return 'EmailAddress';
        case 'ip-address':
          return 'IPv4';
        case 'ipv6':
          return 'IPv6';
        case 'style':
          return 'String'; // TODO
      }
    }
    return 'String';
  }

  visitEnum(enumDef: JSONSchemaEnumDefinition, propertyName: string, prefix: string, cwd: string) {
    let refName = `${prefix}_${propertyName}`;
    if ('title' in enumDef) {
      refName = enumDef.title;
    } else if ('name' in enumDef) {
      refName = enumDef.name;
    }
    const name = this.createName(refName, cwd);
    this.schemaComposer.createEnumTC({
      name,
      values: enumDef.enum.reduce(
        (values, enumValue) => ({
          ...values,
          [this.createName(enumValue, cwd)]: {
            value: enumValue,
          },
        }),
        {}
      ),
    });
    return name;
  }

  private createFieldsMapFromProperties(objectDef: JSONSchemaTypedObjectDefinition, prefix: string, cwd: string) {
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
      let type = this.visit(property, propertyName, prefix, cwd);
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

  private getGraphQLObjectTypeWithTypedObjectDef(
    objectDef: JSONSchemaTypedObjectDefinition,
    objectIdentifier: string,
    cwd: string
  ) {
    const name = this.createName(objectIdentifier, cwd);
    const fields = this.createFieldsMapFromProperties(objectDef, name, cwd);
    if (this.isInput) {
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
    prefix: string,
    cwd: string
  ) {
    return this.getGraphQLObjectTypeWithTypedObjectDef(typedUnnamedObjectDef, prefix + '_' + propertyName, cwd);
  }

  visitTypedNamedObjectDefinition(typedNamedObjectDef: JSONSchemaTypedNamedObjectDefinition, cwd: string) {
    const objectIdentifier = 'name' in typedNamedObjectDef ? typedNamedObjectDef.name : typedNamedObjectDef.title;
    return this.getGraphQLObjectTypeWithTypedObjectDef(typedNamedObjectDef, objectIdentifier, cwd);
  }

  visitObjectReference(objectRef: JSONSchemaObjectReference, cwd: string) {
    return this.createName(objectRef.$ref, cwd);
  }

  visitAny() {
    return 'JSON';
  }

  visitNull() {
    return 'Void';
  }
}
