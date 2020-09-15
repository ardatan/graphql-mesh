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
import { camelCase, flatten, get } from 'lodash';
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
const VALID_FIELD_NAME = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

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
    private externalFileCache = new Map<string, any>(),
    private disableTimestamp = false
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
  createName({ ref, cwd }: { ref: string; cwd: string }) {
    let [externalPath, internalRef] = ref.split('#');
    // If a reference
    if (internalRef) {
      const cwdDir = dirname(cwd);
      const absolutePath = externalPath ? (isAbsolute(externalPath) ? externalPath : join(cwdDir, externalPath)) : cwd;
      const fileName = getFileName(absolutePath);
      if (!this.externalFileCache.has(absolutePath)) {
        const externalSchema = readJSONSync(absolutePath);
        this.externalFileCache.set(absolutePath, externalSchema);
        this.visit({
          def: externalSchema,
          propertyName: this.isInput ? 'Request' : 'Response',
          prefix: fileName,
          cwd: absolutePath,
          ignoreResult: true,
        });
      }
      const internalRefArr = internalRef.split('/').filter(Boolean);
      const internalPath = internalRefArr.join('.');
      const internalPropertyName = internalRefArr[internalRefArr.length - 1];
      const internalDef = get(this.externalFileCache.get(absolutePath), internalPath);
      const result = this.visit({
        def: internalDef,
        propertyName: internalPropertyName,
        prefix: fileName,
        cwd: absolutePath,
      });
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

  visit({
    def,
    propertyName,
    prefix,
    cwd,
    ignoreResult,
    typeName,
  }: {
    def: JSONSchemaDefinition;
    propertyName: string;
    prefix: string;
    cwd: string;
    ignoreResult?: boolean;
    typeName?: string;
  }) {
    def.type = Array.isArray(def.type) ? def.type[0] : def.type;
    const summary = JSON.stringify(def);
    if (this.cache.has(summary)) {
      return this.cache.get(summary);
    }
    if ('definitions' in def) {
      for (const propertyName in def.definitions) {
        const definition = def.definitions[propertyName];
        this.visit({ def: definition, propertyName, prefix, cwd });
      }
    }
    if ('$defs' in def) {
      for (const propertyName in def.$defs) {
        const definition = def.$defs[propertyName];
        this.visit({ def: definition, propertyName, prefix, cwd });
      }
    }
    let result: string;
    switch (def.type) {
      case 'array':
        result = this.visitArray({ arrayDef: def, propertyName, prefix, cwd, typeName });
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
          result = this.visitEnum({ enumDef: def, propertyName, prefix, cwd, typeName });
        } else {
          result = this.visitString({ stringDef: def, propertyName, prefix, cwd, typeName });
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
          result = this.visitTypedNamedObjectDefinition({ typedNamedObjectDef: def, cwd, typeName });
        } else if ('properties' in def) {
          result = this.visitTypedUnnamedObjectDefinition({
            typedUnnamedObjectDef: def,
            propertyName,
            prefix,
            cwd,
            typeName,
          });
        } else if (('additionalProperties' in def && def.additionalProperties) || Object.keys(def).length === 1) {
          result = this.visitAny();
        }
        break;
      default:
        if ('$ref' in def) {
          result = this.visitObjectReference({ objectRef: def, cwd, typeName });
        }
        break;
    }
    if ('oneOf' in def) {
      result = this.visitOneOfReference({ oneOfReference: def, propertyName, prefix, cwd, typeName });
    }
    if (!result && !ignoreResult) {
      throw new Error(
        `Unknown JSON Schema definition for (${typeName || prefix}, ${propertyName}): ${JSON.stringify(def, null, 2)}`
      );
    }
    this.cache.set(summary, result);
    return result;
  }

  visitArray({
    arrayDef,
    propertyName,
    prefix,
    cwd,
    typeName,
  }: {
    arrayDef: JSONSchemaArrayDefinition;
    propertyName: string;
    prefix: string;
    cwd: string;
    typeName?: string;
  }) {
    const [itemsDef] = asArray(arrayDef.items);
    let itemTypeName = 'JSON';
    if (itemsDef) {
      itemTypeName = this.visit({ def: itemsDef, propertyName, prefix, cwd, typeName });
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

  visitString({
    stringDef,
    propertyName,
    prefix,
    cwd,
    typeName,
  }: {
    stringDef: JSONSchemaStringDefinition;
    propertyName: string;
    prefix: string;
    cwd: string;
    typeName?: string;
  }) {
    if (stringDef.pattern) {
      let refName = `${prefix}_${propertyName}`;
      if ('format' in stringDef) {
        refName = stringDef.format;
      }
      const scalarName = typeName || this.createName({ ref: refName, cwd });
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
          return this.disableTimestamp ? 'String' : 'Timestamp';
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

  visitEnum({
    enumDef,
    propertyName,
    prefix,
    cwd,
    typeName,
  }: {
    enumDef: JSONSchemaEnumDefinition;
    propertyName: string;
    prefix: string;
    cwd: string;
    typeName?: string;
  }) {
    let refName = `${prefix}_${propertyName}`;
    if ('title' in enumDef) {
      refName = enumDef.title;
    } else if ('name' in enumDef) {
      refName = enumDef.name;
    }
    const name = typeName || this.createName({ ref: refName, cwd });
    this.schemaComposer.createEnumTC({
      name,
      values: enumDef.enum.reduce(
        (values, enumValue) => ({
          ...values,
          [this.createName({ ref: enumValue, cwd })]: {
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
      let fieldName = propertyName;
      if (!VALID_FIELD_NAME.test(fieldName)) {
        fieldName = camelCase(propertyName);
      }
      if (/^[0-9]/.test(fieldName) || fieldName === '') {
        fieldName = `_${fieldName}`;
      }
      const property = objectDef.properties[propertyName];
      let type = this.visit({ def: property, propertyName, prefix, cwd });
      const isRequired = 'required' in objectDef && objectDef.required?.includes(propertyName);
      if (isRequired) {
        type += '!';
      }
      fieldMap[fieldName] = {
        type,
        description: property.description,
      };
      if (!this.isInput && fieldName !== propertyName) {
        fieldMap[fieldName].resolve = (root: any) => root[propertyName];
      }
    }
    return fieldMap;
  }

  private getGraphQLObjectTypeWithTypedObjectDef({
    objectDef,
    objectIdentifier,
    cwd,
    typeName,
  }: {
    objectDef: JSONSchemaTypedObjectDefinition;
    objectIdentifier: string;
    cwd: string;
    typeName: string;
  }) {
    const name = typeName || this.createName({ ref: objectIdentifier, cwd });
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

  visitTypedUnnamedObjectDefinition({
    typedUnnamedObjectDef,
    propertyName,
    prefix,
    cwd,
    typeName,
  }: {
    typedUnnamedObjectDef: JSONSchemaTypedUnnamedObjectDefinition;
    propertyName: string;
    prefix: string;
    cwd: string;
    typeName?: string;
  }) {
    return this.getGraphQLObjectTypeWithTypedObjectDef({
      objectDef: typedUnnamedObjectDef,
      objectIdentifier: prefix + '_' + propertyName,
      cwd,
      typeName,
    });
  }

  visitTypedNamedObjectDefinition({
    typedNamedObjectDef,
    cwd,
    typeName,
  }: {
    typedNamedObjectDef: JSONSchemaTypedNamedObjectDefinition;
    cwd: string;
    typeName?: string;
  }) {
    const objectIdentifier = 'name' in typedNamedObjectDef ? typedNamedObjectDef.name : typedNamedObjectDef.title;
    return this.getGraphQLObjectTypeWithTypedObjectDef({
      objectDef: typedNamedObjectDef,
      objectIdentifier,
      cwd,
      typeName,
    });
  }

  visitObjectReference({
    objectRef,
    cwd,
    typeName,
  }: {
    objectRef: JSONSchemaObjectReference;
    cwd: string;
    typeName: string;
  }) {
    return typeName || this.createName({ ref: objectRef.$ref, cwd });
  }

  visitAny() {
    return 'JSON';
  }

  visitNull() {
    return 'Void';
  }

  visitOneOfReference({
    oneOfReference,
    propertyName,
    prefix,
    cwd,
    typeName,
  }: {
    oneOfReference: JSONSchemaOneOfDefinition;
    propertyName: string;
    prefix: string;
    cwd: string;
    typeName?: string;
  }) {
    let unionIdentifier = oneOfReference.title;
    if (!unionIdentifier) {
      unionIdentifier = prefix + '_' + propertyName;
    }
    const unionName = typeName || this.createName({ ref: unionIdentifier, cwd });
    const types = oneOfReference.oneOf.map(def => this.visit({ def, propertyName, prefix, cwd }));

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
