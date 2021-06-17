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
  JSONSchemaNumberDefinition,
} from './json-schema-types';
import { SchemaComposer } from 'graphql-compose';
import { pascalCase } from 'pascal-case';
import { join, isAbsolute, dirname } from 'path';
import { camelCase, flatten, get } from 'lodash';
import { RegularExpression } from 'graphql-scalars';
import Ajv from 'ajv';
import { jsonFlatStringify, readJSONSync } from '@graphql-mesh/utils';

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
  private summaryCache: Map<string, string> = new Map();
  private ajv: Ajv;
  constructor(
    private schemaComposer: SchemaComposer<TContext>,
    private isInput: boolean,
    private externalFileCache: Record<string, any> = {},
    private disableTimestamp = false
  ) {
    this.ajv = new Ajv({
      strict: false,
      logger: false,
    });
  }

  // TODO: Should be improved!
  private visitedRefNameMap = new Map<string, string>();
  createName({ ref, cwd }: { ref: string; cwd: string }) {
    if (this.visitedRefNameMap.has(ref)) {
      return this.visitedRefNameMap.get(ref)!;
    }
    let [externalPath, internalRef] = ref.split('#');
    // If a reference
    if (internalRef) {
      const cwdDir = dirname(cwd);
      const absolutePath = externalPath ? (isAbsolute(externalPath) ? externalPath : join(cwdDir, externalPath)) : cwd;
      const fileName = getFileName(absolutePath);
      if (!(absolutePath in this.externalFileCache)) {
        const externalSchema = readJSONSync(absolutePath);
        this.externalFileCache[absolutePath] = externalSchema;
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
      const internalDef = get(this.externalFileCache[absolutePath], internalPath);
      const result = this.visit({
        def: internalDef,
        propertyName: internalPropertyName,
        prefix: fileName,
        cwd: absolutePath,
        typeName: internalRef.includes('definitions/') && internalPropertyName,
      });
      this.visitedRefNameMap.set(ref, result);
      return result;
    } else {
      internalRef = ref;
    }
    internalRef = internalRef.split('/').pop();
    for (const sep of invalidSeperators) {
      internalRef = internalRef.split(sep).join('_');
    }
    let name = pascalCase(internalRef);
    if (this.schemaComposer.has(name)) {
      const fileNamePrefix = getFileName(cwd).split('.').join('_');
      return pascalCase(fileNamePrefix + '_' + name);
    }
    if (/^[0-9]/.test(name) || name === '') {
      name = '_' + name;
    }
    this.visitedRefNameMap.set(ref, name);
    return name;
  }

  private namedVisitedDefs = new Set<string>();
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
    if (typeName) {
      if (typeName === 'Subscription') {
        typeName = prefix + 'Subscription';
      }
      if (this.namedVisitedDefs.has(typeName)) {
        return typeName;
      }
      this.namedVisitedDefs.add(typeName);
    }
    def.type = Array.isArray(def.type) ? def.type[0] : def.type;
    const summary = jsonFlatStringify(def);
    if (this.summaryCache.has(summary)) {
      return this.summaryCache.get(summary);
    }
    if ('definitions' in def) {
      for (const propertyName in def.definitions) {
        const definition = def.definitions[propertyName];
        const result = this.visit({ def: definition, propertyName, prefix, cwd, typeName: propertyName });
        this.visitedRefNameMap.set('#/definitions/' + propertyName, result);
      }
    }
    if ('$defs' in def) {
      for (const propertyName in def.$defs) {
        const definition = def.$defs[propertyName];
        const result = this.visit({ def: definition, propertyName, prefix, cwd, typeName: propertyName });
        this.visitedRefNameMap.set('#/$defs/' + propertyName, result);
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
        result = this.visitNumber({ numberDef: def, propertyName, prefix, cwd, typeName });
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
      default:
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
        } else if ('$ref' in def) {
          result = this.visitObjectReference({ objectRef: def, cwd, typeName });
        } else if ('enum' in def) {
          result = this.visitEnum({ enumDef: def, propertyName, prefix, cwd, typeName });
        }
    }
    if ('oneOf' in def) {
      result = this.visitOneOfReference({ def, propertyName, prefix, cwd, typeName });
    }
    if ('const' in def) {
      result = this.visitConst({ def });
    }
    if (!result && !ignoreResult) {
      console.warn(`Unknown JSON Schema definition for (${typeName || prefix}, ${propertyName})`);
      result = this.visitAny();
    }
    this.summaryCache.set(summary, result);
    this.namedVisitedDefs.add(result);
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

  visitNumber({
    numberDef,
    propertyName,
    prefix,
    cwd,
    typeName,
  }: {
    numberDef: JSONSchemaNumberDefinition;
    propertyName: string;
    prefix: string;
    cwd: string;
    typeName?: string;
  }) {
    if (numberDef.pattern) {
      let refName = `${prefix}_${propertyName}`;
      if ('format' in numberDef) {
        refName = numberDef.format;
      }
      const scalarName = typeName || this.createName({ ref: refName, cwd });
      const scalar = new RegularExpression(scalarName, new RegExp(numberDef.pattern), {
        description: numberDef.description,
      });
      this.schemaComposer.add(scalar);
      return scalarName;
    }
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
      const scalar = new RegularExpression(scalarName, new RegExp(stringDef.pattern), {
        description: stringDef.description,
      });
      this.schemaComposer.add(scalar);
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

  visitConst({ def }: { def: { const: string } }) {
    const constValue = def.const;
    const scalarName = constValue + 'ConstValue';
    this.schemaComposer.add(new RegularExpression(scalarName, new RegExp(constValue)));
    return scalarName;
  }

  visitOneOfReference({
    def,
    propertyName,
    prefix,
    cwd,
    typeName,
  }: {
    def: JSONSchemaOneOfDefinition;
    propertyName: string;
    prefix: string;
    cwd: string;
    typeName?: string;
  }) {
    let unionIdentifier = def.title;
    if (!unionIdentifier) {
      unionIdentifier = prefix + '_' + propertyName;
    }
    const unionName = typeName || this.createName({ ref: unionIdentifier, cwd });
    const types = def.oneOf.map(oneOfDef => this.visit({ def: oneOfDef, propertyName, prefix, cwd }));
    this.schemaComposer.createUnionTC({
      name: unionName,
      types,
      resolveType: (root: any) => {
        if (root.__typename) {
          return root.__typename;
        }
        const discriminatorPropertyName = def.discriminator?.propertyName;
        if (discriminatorPropertyName) {
          const discriminatorPropertyValue = root[discriminatorPropertyName];
          if (discriminatorPropertyValue) {
            const discriminatorTypeRef = def.discriminator.mapping[discriminatorPropertyValue];
            return this.visitedRefNameMap.get(discriminatorTypeRef);
          }
        }
        for (const typeName of types) {
          const typeDef = this.schemaComposer.getAnyTC(typeName);
          const jsonSchema: any = typeDef.getExtension('objectDef');
          jsonSchema.$schema = undefined;
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
