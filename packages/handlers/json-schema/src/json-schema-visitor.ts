import { GraphQLNamedType, GraphQLList, GraphQLScalarType, Kind, GraphQLBoolean, GraphQLInt, GraphQLEnumType, GraphQLSchema, GraphQLString, GraphQLInputObjectType, GraphQLObjectType, GraphQLType, GraphQLFloat, isOutputType, isInputType, isObjectType } from "graphql";
import { JSONSchemaDefinition, JSONSchemaArrayDefinition, JSONSchemaObjectReference, JSONSchemaBooleanDefinition, JSONSchemaEnumDefinition, JSONSchemaTypedUnnamedObjectDefinition, JSONSchemaTypedNamedObjectDefinition, JSONSchemaUntypedUnnamedObjectDefinition, JSONSchemaAnyDefinition } from "./json-schema-types";
import { pascalCase } from 'pascal-case';
import GraphQLJSON from "graphql-type-json";

export class JSONSchemaVisitor {
    constructor(
        private prefix: string,
        private isInput: boolean, 
        private _typeCache = new Map<string, GraphQLType>(),
        private _defCache = new Map<string, JSONSchemaDefinition>(),
    ) {}
    private getNameFromId(id: string) {
        const [actualTypePath, genericTypePart] = id.split('<');
        let genericTypeName = '';
        if (genericTypePart) {
            const [genericTypePath] = genericTypePart.split('>');
            const genericTypeParts = genericTypePath.split(':');
            genericTypeName = genericTypeParts[genericTypeParts.length - 1];
        }
        const actualTypePathParts = actualTypePath.split(':');
        const actualTypeName = actualTypePathParts[actualTypePathParts.length - 1];
        let returnName = actualTypeName + genericTypeName;
        if (this._typeCache.has(returnName)) {
            const existingType = this._typeCache.get(returnName);
            if (this.isInput && !isInputType(existingType)) {
                returnName += 'Input';
            } else if (!this.isInput && !isOutputType(existingType)) {
                returnName += 'Output';
            }
        }
        return pascalCase(returnName);
    }
    visit(def: JSONSchemaDefinition, propertyName: string): GraphQLType {
        switch (def.type) {
            case 'array':
                return this.visitArray(def, propertyName);
            case 'boolean':
                return this.visitBoolean();
            case 'integer':
                return this.visitInteger();
            case 'number':
                return this.visitNumber();
            case 'string':
                if ('enum' in def) {
                    return this.visitEnum(def, propertyName)
                } else {
                    return this.visitString();
                }
            case 'any':
                return this.visitAny(propertyName);
            case 'object':
                if ('$ref' in def) {
                    return this.visitObjectReference(def, propertyName);
                } else if ('name' in def) {
                    return this.visitTypedNamedObjectDefinition(def);
                } else if ('id' in def) {
                    return this.visitTypedUnnamedObjectDefinition(def);
                } else if ('additionalProperties' in def) {
                    return this.visitUntypedUnnamedObjectDefinition(def);
                }
        }
        throw new Error(`Unexpected schema definition:
        ${JSON.stringify(def, null, 2)}`);
    }
    visitArray(arrayDef: JSONSchemaArrayDefinition, propertyName: string) {
        return new GraphQLList(this.visit(arrayDef.items, propertyName));
    }
    visitBoolean() {
        return GraphQLBoolean;
    }
    visitInteger() {
        return GraphQLInt;
    }
    visitNumber() {
        return GraphQLFloat;
    }
    visitString() {
        return GraphQLString;
    }
    visitEnum(enumRef: JSONSchemaEnumDefinition, propertyName: string) {
        const name = pascalCase(this.prefix + '_' + propertyName);
        if (!this._typeCache.has(JSON.stringify(enumRef))) {
            this._typeCache.set(JSON.stringify(enumRef), new GraphQLEnumType({
                name,
                description: enumRef.description,
                values: enumRef.enum.reduce((values, enumValue) => ({ ...values, [enumValue]: {} }), {}),
            }));
        } 
        return this._typeCache.get(JSON.stringify(enumRef))!;
    }
    visitTypedUnnamedObjectDefinition(typedUnnamedObjectDef: JSONSchemaTypedUnnamedObjectDefinition) {
        const ObjectType = this.isInput ? GraphQLInputObjectType : GraphQLObjectType;
        const name = this.getNameFromId(typedUnnamedObjectDef.id);
        if (!this._typeCache.has(name)) {
            this._typeCache.set(name, new ObjectType({
                name,
                description: typedUnnamedObjectDef.description,
                fields: Object.keys(typedUnnamedObjectDef.properties).reduce((fields, propertyName) => ({
                    ...fields,
                    [propertyName]: {
                        type: this.visit(typedUnnamedObjectDef.properties[propertyName], propertyName),
                        description: typedUnnamedObjectDef.properties[propertyName].description,
                    }
                }), {})
            }));
            this._defCache.set(typedUnnamedObjectDef.id, typedUnnamedObjectDef);
        }
        return this._typeCache.get(name)!;
    }
    visitTypedNamedObjectDefinition(typedNamedObjectDef: JSONSchemaTypedNamedObjectDefinition) {
        const ObjectType = this.isInput ? GraphQLInputObjectType : GraphQLObjectType;
        const name = typedNamedObjectDef.name;
        if (!this._typeCache.has(name)) {
            this._typeCache.set(name, new ObjectType({
                name,
                description: typedNamedObjectDef.description,
                fields: Object.keys(typedNamedObjectDef.properties).reduce((fields, propertyName) => ({
                    ...fields,
                    [propertyName]: {
                        type: this.visit(typedNamedObjectDef.properties[propertyName], propertyName),
                        description: typedNamedObjectDef.properties[propertyName].description,
                    }
                }), {})
            }))
            this._defCache.set(name, typedNamedObjectDef);
        }
        return this._typeCache.get(name)!;
    }
    visitUntypedUnnamedObjectDefinition(untypedUnnamedObjectDefinition: JSONSchemaUntypedUnnamedObjectDefinition) {
        const objectIdentifier = JSON.stringify(untypedUnnamedObjectDefinition);
        if (!this._typeCache.has(objectIdentifier)) {
            this._typeCache.set(
                objectIdentifier,
                GraphQLJSON
            );
        }
        return this._typeCache.get(objectIdentifier)!;
    }
    visitObjectReference(objectRef: JSONSchemaObjectReference, propertyName: string) {
        const name = this.getNameFromId(objectRef.$ref);
        if (!this._typeCache.has(name) && !this._defCache.has(objectRef.$ref)) {
            this._typeCache.set(
                name,
                GraphQLJSON
            );
        } else if (this._defCache.has(objectRef.$ref)) {
            return this.visit(this._defCache.get(objectRef.$ref)!, propertyName);
        }
        return this._typeCache.get(name)!;
    }
    visitAny(propertyName: string) {
        const objectIdentifier = propertyName;
        if (!this._typeCache.has(objectIdentifier)) {
            this._typeCache.set(
                objectIdentifier,
                GraphQLJSON
            );
        }
        return this._typeCache.get(objectIdentifier)!;
    }
}
