import { GraphQLList, GraphQLBoolean, GraphQLInt, GraphQLEnumType, GraphQLString, GraphQLInputObjectType, GraphQLObjectType, GraphQLType, GraphQLFloat, GraphQLFieldConfigMap, GraphQLInputFieldConfigMap, GraphQLInputType, GraphQLOutputType, GraphQLNonNull } from "graphql";
import { JSONSchemaDefinition, JSONSchemaArrayDefinition, JSONSchemaObjectReference, JSONSchemaEnumDefinition, JSONSchemaTypedUnnamedObjectDefinition, JSONSchemaTypedNamedObjectDefinition, JSONSchemaTypedObjectDefinition } from "./json-schema-types";
import { pascalCase } from 'pascal-case';
import { JSONResolver as GraphQLJSON } from 'graphql-scalars';

type GraphQLSharedType = GraphQLInputType & GraphQLOutputType;

export class JSONSchemaVisitorCache {
    public readonly inputSpecificTypesByIdentifier = new Map<string, GraphQLInputType>();
    public readonly outputSpecificTypesByIdentifier = new Map<string, GraphQLOutputType>();
    public readonly sharedTypesByIdentifier = new Map<string, GraphQLInputType | GraphQLOutputType>();
    public readonly typesByNames = new Map<string, GraphQLInputType | GraphQLOutputType>();
    public readonly prefixedNames = new Set<string>();
    public readonly potentialPrefixes = new WeakMap<GraphQLInputType | GraphQLOutputType, string>();
}

export class JSONSchemaVisitor {
    constructor(
        private cache = new JSONSchemaVisitorCache(),
    ) {}
    private getNameFromId(id: string) {
        const [actualTypePath, genericTypePart] = id.split('<');
        const actualTypePathParts = actualTypePath.split(':');
        const actualTypeName = actualTypePathParts[actualTypePathParts.length - 1];
        let finalTypeName = actualTypeName;
        if (genericTypePart) {
            const [genericTypePath] = genericTypePart.split('>');
            const genericTypeParts = genericTypePath.split(':');
            const genericTypeName = genericTypeParts[genericTypeParts.length - 1];
            finalTypeName = actualTypeName + '_' + genericTypeName;
        }
        return pascalCase(finalTypeName);
    }
    visit(def: JSONSchemaDefinition, propertyName: string, prefix: string, isInput: boolean): GraphQLType {
        if ('definitions' in def) {
            for (const propertyName in def.definitions) {
                const definition = def.definitions[propertyName];
                this.visit(definition, propertyName, prefix, isInput);
            }
        }
        if ('$defs' in def) {
            for (const propertyName in def.$defs) {
                const definition = def.$defs[propertyName];
                this.visit(definition, propertyName, prefix, isInput);
            }
        }
        switch (def.type) {
            case 'array':
                return this.visitArray(def, propertyName, prefix, isInput);
            case 'boolean':
                return this.visitBoolean();
            case 'integer':
                return this.visitInteger();
            case 'number':
                return this.visitNumber();
            case 'string':
                if ('enum' in def) {
                    return this.visitEnum(def, propertyName, prefix)
                } else {
                    return this.visitString();
                }
            case 'any':
                return this.visitAny();
            case 'object':
                if ('$ref' in def) {
                    return this.visitObjectReference(def, isInput);
                } else if ('name' in def || 'title' in def) {
                    return this.visitTypedNamedObjectDefinition(def, prefix, isInput);
                }  else if ('properties' in def){
                    return this.visitTypedUnnamedObjectDefinition(def, propertyName, prefix, isInput);
                } else if ('additionalProperties' in def && def.additionalProperties) {
                    return this.visitAny();
                }
            break;
        }
        throw new Error(`Unexpected schema definition:
        ${JSON.stringify(def, null, 2)}`);
    }
    visitArray(arrayDef: JSONSchemaArrayDefinition, propertyName: string, prefix: string, isInput: boolean) {
        return new GraphQLList(this.visit(arrayDef.items, propertyName, prefix, isInput));
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
    visitEnum(
        enumDef: JSONSchemaEnumDefinition, 
        propertyName: string, 
        prefix: string,
    ) {
        const enumIdentifier = JSON.stringify(enumDef);
        if (!this.cache.sharedTypesByIdentifier.has(enumIdentifier)) {
            // If there is a different enum but with the same name,
            // just change the existing one's name and use prefixes from now on
            let name = pascalCase(propertyName);
            if (!this.cache.prefixedNames.has(name)
                && this.cache.typesByNames.has(name)) {
                const existingType = this.cache.typesByNames.get(name)!;
                if ('name' in existingType) {
                    const prefix = this.cache.potentialPrefixes.get(existingType);
                    existingType.name = pascalCase(prefix + '_' + name);
                    this.cache.prefixedNames.add(name);
                    this.cache.typesByNames.delete(name);
                    if (this.cache.typesByNames.has(existingType.name)) {
                        throw existingType.name;
                    }
                    this.cache.typesByNames.set(existingType.name, existingType);
                }
            }
            if (this.cache.prefixedNames.has(name)) {
                name = pascalCase(prefix + '_' + name);
            }
            const type = new GraphQLEnumType({
                name,
                description: enumDef.description,
                values: enumDef.enum.reduce((values, enumValue) => ({ ...values, [enumValue]: {} }), {}),
            });
            this.cache.potentialPrefixes.set(type, prefix);
            this.cache.sharedTypesByIdentifier.set(enumIdentifier, type);
            if (this.cache.typesByNames.has(name)) {
                throw name;
            }
            this.cache.typesByNames.set(name, type);
        }
        return this.cache.sharedTypesByIdentifier.get(enumIdentifier)!;
    }
    private createFieldsMapFromProperties(objectDef: JSONSchemaTypedObjectDefinition, prefix: string, isInput: boolean) {
        const fieldMap: GraphQLInputFieldConfigMap & GraphQLFieldConfigMap<any, any> = {};
        for (const propertyName in objectDef.properties) {
            const fieldName = propertyName.split(':').join('_');
            const property = objectDef.properties[propertyName];
            const type = this.visit(property, propertyName, prefix, isInput) as GraphQLSharedType;
            const isRequired = 'required' in objectDef && objectDef.required?.includes(propertyName);
            fieldMap[fieldName] = {
                type: isRequired ? new GraphQLNonNull(type) : type,
                description: property.description,
            }
            if (fieldName !== propertyName) {
                fieldMap[fieldName].resolve = (root: any) => root[propertyName];
            }
        }
        return fieldMap;
    }
    private getSpecificTypeByIdentifier(identifier: string, isInput: boolean) {
        return this.cache.sharedTypesByIdentifier.get(identifier) ||
        (isInput ? this.cache.inputSpecificTypesByIdentifier.get(identifier) : this.cache.outputSpecificTypesByIdentifier.get(identifier));
    }
    private getGraphQLObjectTypeWithTypedObjectDef(
        objectDef: JSONSchemaTypedObjectDefinition,
        objectIdentifier: string,
        rawName: string, 
        prefix: string, 
        isInput: boolean
    ) {
        const specificType = this.getSpecificTypeByIdentifier(objectIdentifier, isInput);
        if (!specificType) {
            let name = rawName;
            // If there is a different object but with the same name,
            // just change the existing one's name and use prefixes from now on
            if (!this.cache.prefixedNames.has(name)
                && this.cache.typesByNames.has(name)) {
                const existingType = this.cache.typesByNames.get(name)!;
                if ('name' in existingType) {
                    const existingTypePrefix = this.cache.potentialPrefixes.get(existingType);
                    existingType.name = pascalCase(existingTypePrefix + '_' + name);
                    this.cache.prefixedNames.add(name);
                    this.cache.typesByNames.delete(name);
                    if (this.cache.typesByNames.has(existingType.name)) {
                        throw existingType.name;
                    }
                    this.cache.typesByNames.set(existingType.name, existingType);
                }
            }
            // If this name should be prefixed
            if (this.cache.prefixedNames.has(name)) {
                name = pascalCase(prefix + '_' + name);
            }

            if (this.cache.typesByNames.has(name)) {
                const suffix = isInput ? 'Input' : 'Output';
                name = pascalCase(name + '_' + suffix);
            }

            if (isInput) {
                const inputType = new GraphQLInputObjectType({
                    name,
                    description: objectDef.description,
                    fields: this.createFieldsMapFromProperties(objectDef, name, true),
                });
                this.cache.inputSpecificTypesByIdentifier.set(objectIdentifier, inputType);
                this.cache.typesByNames.set(inputType.name, inputType);
                this.cache.potentialPrefixes.set(inputType, prefix);
                return inputType;
            } else {
                const outputType = new GraphQLObjectType({
                    name,
                    description: objectDef.description,
                    fields: this.createFieldsMapFromProperties(objectDef, name, false),
                });
                this.cache.outputSpecificTypesByIdentifier.set(objectIdentifier, outputType);
                this.cache.typesByNames.set(outputType.name, outputType);
                this.cache.potentialPrefixes.set(outputType, prefix);
                return outputType;
            }
        }
        return specificType;
    }
    visitTypedUnnamedObjectDefinition(typedUnnamedObjectDef: JSONSchemaTypedUnnamedObjectDefinition, propertyName: string, prefix: string, isInput: boolean) {
        const objectIdentifier = 'id' in typedUnnamedObjectDef ? typedUnnamedObjectDef.id : '$id' in typedUnnamedObjectDef ? typedUnnamedObjectDef.$id : `${prefix}_${propertyName}`;
        const name = this.getNameFromId(objectIdentifier);
        return this.getGraphQLObjectTypeWithTypedObjectDef(typedUnnamedObjectDef, objectIdentifier, name, prefix, isInput);
    }
    visitTypedNamedObjectDefinition(typedNamedObjectDef: JSONSchemaTypedNamedObjectDefinition, prefix: string, isInput: boolean) {
        const objectIdentifier = 'name' in typedNamedObjectDef ? typedNamedObjectDef.name : typedNamedObjectDef.title;
        const name = pascalCase(objectIdentifier);
        return this.getGraphQLObjectTypeWithTypedObjectDef(typedNamedObjectDef, objectIdentifier, name, prefix, isInput);
    }
    private warnedReferences = new Set<string>();
    visitObjectReference(objectRef: JSONSchemaObjectReference, isInput: boolean) {
        const referenceParts = objectRef.$ref.split('/');
        const reference = referenceParts[referenceParts.length - 1];
        const specificType = this.getSpecificTypeByIdentifier(reference, isInput);
        if (!specificType) {
            if (!this.warnedReferences.has(reference) && !this.warnedReferences.has(reference)) {
                console.warn(`Missing JSON Schema reference: ${reference}. GraphQLJSON will be used instead!`);
                this.warnedReferences.add(reference);
            }
            return this.visitAny();
        }
        return specificType;
    }
    visitAny() {
        return GraphQLJSON;
    }
}
