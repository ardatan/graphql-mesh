import {
  JSONSchemaDefinition,
  JSONSchemaArrayDefinition,
  JSONSchemaObjectReference,
  JSONSchemaEnumDefinition,
  JSONSchemaTypedUnnamedObjectDefinition,
  JSONSchemaTypedNamedObjectDefinition,
  JSONSchemaTypedObjectDefinition,
  JSONSchemaStringDefinition,
  JSONSchemaOneOfDefinition,
} from './json-schema-types';
import { SchemaComposer } from 'graphql-compose';
import { pascalCase } from 'pascal-case';
import { join, isAbsolute, dirname } from 'path';
import { readJSONSync } from 'fs-extra';
import { flatten, get } from 'lodash';
import { RegularExpression } from 'graphql-scalars';
import Ajv from 'ajv';

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
  private ajv: Ajv.Ajv;
  constructor(
    private schemaComposer: SchemaComposer<TContext>,
    private isInput: boolean,
    private externalFileCache = new Map<string, any>()
  ) {
    this.ajv = new Ajv({
      schemaId: 'auto',
      missingRefs: 'ignore',
      logger: false,
    });
    // Settings for draft-04
    const metaSchema = require('ajv/lib/refs/json-schema-draft-04.json');
    this.ajv.addMetaSchema(metaSchema);
    this.cache = new Map();
  }

  // TODO: Should be improved!
  createName(ref: string, cwd: string) {
    let [externalPath, internalRef] = ref.split('#');
    // If a reference
    if (internalRef) {
      const cwdDir = dirname(cwd);
      const absolutePath = externalPath ? (isAbsolute(externalPath) ? externalPath : join(cwdDir, externalPath)) : cwd;
      const fileName = getFileName(absolutePath);
      if (!this.externalFileCache.has(absolutePath)) {
        const externalSchema = readJSONSync(absolutePath);
        this.externalFileCache.set(absolutePath, externalSchema);
        this.visit(externalSchema, this.isInput ? 'Request' : 'Response', fileName, absolutePath, true);
      }
      const internalRefArr = internalRef.split('/').filter(Boolean);
      const internalPath = internalRefArr.join('.');
      const internalPropertyName = internalRefArr[internalRefArr.length - 1];
      const internalDef = get(this.externalFileCache.get(absolutePath), internalPath);
      const result = this.visit(internalDef, internalPropertyName, fileName, absolutePath);
      return result;
    } else {
      internalRef = ref;
    }
    internalRef = internalRef.split('/').pop();
    for (const sep of invalidSeperators) {
      internalRef = internalRef.split(sep).join('_');
    }
    const name = pascalCase(internalRef);
    if (this.schemaComposer.has(name)) {
      const fileNamePrefix = getFileName(cwd).split('.').join('_');
      return pascalCase(fileNamePrefix + '_' + name);
    }
    return name;
  }

  visit(def: JSONSchemaDefinition, propertyName: string, prefix: string, cwd: string, ignoreResult?: boolean) {
    def.type = Array.isArray(def.type) ? def.type[0] : def.type;
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
          result = this.visitString(def, propertyName, prefix, cwd);
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
    if ('oneOf' in def) {
      result = this.visitOneOfReference(def, propertyName, prefix, cwd);
    }
    if (!result && !ignoreResult) {
      throw new Error(
        `Unknown JSON Schema definition for (${prefix}, ${propertyName}): ${JSON.stringify(def, null, 2)}`
      );
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

  visitString(stringDef: JSONSchemaStringDefinition, propertyName: string, prefix: string, cwd: string) {
    if (stringDef.pattern) {
      let refName = `${prefix}_${propertyName}`;
      if ('format' in stringDef) {
        refName = stringDef.format;
      }
      const scalarName = this.createName(refName, cwd);
      this.schemaComposer.add(new RegularExpression(scalarName, new RegExp(stringDef.pattern)));
      return scalarName;
    }
    if (stringDef.format) {
      switch (stringDef.format) {
        case 'date-time':
          return 'DateTime';
        case 'date':
          return 'Date';
        case 'time':
          return 'Time';
        case 'utc-millisec':
          /*
          return 'Timestamp';
          */
          return 'String';
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
        extensions: {
          objectDef,
        },
      });
    } else {
      this.schemaComposer.createObjectTC({
        name,
        fields,
        extensions: {
          objectDef,
        },
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

  visitOneOfReference(oneOfReference: JSONSchemaOneOfDefinition, propertyName: string, prefix: string, cwd: string) {
    let unionIdentifier = oneOfReference.title;
    if (!unionIdentifier) {
      unionIdentifier = prefix + '_' + propertyName;
    }
    const unionName = this.createName(unionIdentifier, cwd);
    const types = oneOfReference.oneOf.map(def => this.visit(def, propertyName, prefix, cwd));

    this.schemaComposer.createUnionTC({
      name: unionName,
      types,
      resolveType: (root: any) => {
        for (const typeName of types) {
          const typeDef = this.schemaComposer.getAnyTC(typeName);
          const isValid = this.ajv.validate(typeDef.getExtension('objectDef'), root);
          if (isValid) {
            return typeName;
          }
        }
        return null;
      },
    });
    return unionName;
  }
}
