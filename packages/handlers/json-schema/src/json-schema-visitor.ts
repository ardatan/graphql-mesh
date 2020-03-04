import { GraphQLList, GraphQLBoolean, GraphQLInt, GraphQLEnumType, GraphQLString, GraphQLInputObjectType, GraphQLObjectType, GraphQLType, GraphQLFloat, GraphQLFieldConfigMap, GraphQLInputFieldConfigMap, GraphQLInputType, GraphQLOutputType } from "graphql";
import { JSONSchemaDefinition, JSONSchemaArrayDefinition, JSONSchemaObjectReference, JSONSchemaEnumDefinition, JSONSchemaTypedUnnamedObjectDefinition, JSONSchemaTypedNamedObjectDefinition, JSONSchemaTypedObjectDefinition } from "./json-schema-types";
import { pascalCase } from 'pascal-case';
import GraphQLJSON from "graphql-type-json";

type GraphQLSharedType = GraphQLInputType & GraphQLOutputType;

export class JSONSchemaVisitorCache {
    public readonly inputSpecificTypesByIdentifier = new Map<string, GraphQLInputType>();
    public readonly outputSpecificTypesByIdentifier = new Map<string, GraphQLOutputType>();
    public readonly sharedTypesByIdentifier = new Map<string, GraphQLInputType | GraphQLOutputType>();
    public readonly typesByNames = new Map<string, GraphQLInputType | GraphQLOutputType>();
    public readonly prefixedNames = new Set<string>();
    public readonly potentialPrefixes = new WeakMap<GraphQLInputType | GraphQLOutputType, string>();
}

export interface JSONSchemaVisitOptions {
    isInput: boolean;
    prefix: string;
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
    visit(def: JSONSchemaDefinition, propertyName: string, options: JSONSchemaVisitOptions): GraphQLType {
        if ('definitions' in def) {
            for (const propertyName in def.definitions) {
                const definition = def.definitions[propertyName];
                this.visit(definition, propertyName, options);
            }
        }
        if ('$defs' in def) {
            for (const propertyName in def.$defs) {
                const definition = def.$defs[propertyName];
                this.visit(definition, propertyName, options);
            }
        }
        switch (def.type) {
            case 'array':
                return this.visitArray(def, propertyName, options);
            case 'boolean':
                return this.visitBoolean();
            case 'integer':
                return this.visitInteger();
            case 'number':
                return this.visitNumber();
            case 'string':
                if ('enum' in def) {
                    return this.visitEnum(def, propertyName, options)
                } else {
                    return this.visitString();
                }
            case 'any':
                return this.visitAny();
            case 'object':
                if ('$ref' in def) {
                    return this.visitObjectReference(def, propertyName, options);
                } else if ('name' in def) {
                    return this.visitTypedNamedObjectDefinition(def, options);
                } else if ('id' in def || '$id' in def) {
                    return this.visitTypedUnnamedObjectDefinition(def, options);
                } else if ('additionalProperties' in def) {
                    return this.visitAny();
                }
        }
        throw new Error(`Unexpected schema definition:
        ${JSON.stringify(def, null, 2)}`);
    }
    visitArray(arrayDef: JSONSchemaArrayDefinition, propertyName: string, options: JSONSchemaVisitOptions) {
        return new GraphQLList(this.visit(arrayDef.items, propertyName, options));
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
        options: JSONSchemaVisitOptions
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
                    this.cache.typesByNames.set(existingType.name, existingType);
                }
            }
            if (this.cache.prefixedNames.has(name)) {
                name = pascalCase(options.prefix + '_' + name);
            }
            const type = new GraphQLEnumType({
                name,
                description: enumDef.description,
                values: enumDef.enum.reduce((values, enumValue) => ({ ...values, [enumValue]: {} }), {}),
            });
            this.cache.potentialPrefixes.set(type, options.prefix);
            this.cache.sharedTypesByIdentifier.set(enumIdentifier, type);
            this.cache.typesByNames.set(name, type);
        }
        return this.cache.sharedTypesByIdentifier.get(enumIdentifier)!;
    }
    private createFieldsMapFromProperties(properties: { [propertyName: string]: JSONSchemaDefinition }, options: JSONSchemaVisitOptions) {
        const fieldMap: GraphQLInputFieldConfigMap & GraphQLFieldConfigMap<any, any> = {};
        for (const propertyName in properties) {
            const property = properties[propertyName];
            fieldMap[propertyName] = {
                type: this.visit(property, propertyName, options) as GraphQLSharedType,
                description: property.description,
            }
        }
        return fieldMap;
    }
    private getSpecificTypeByIdentifier(identifier: string, options: JSONSchemaVisitOptions) {
        return this.cache.sharedTypesByIdentifier.get(identifier) ||
        (options.isInput ? this.cache.inputSpecificTypesByIdentifier.get(identifier) : this.cache.outputSpecificTypesByIdentifier.get(identifier));
    }
    private getGraphQLObjectTypeWithTypedObjectDef(
        objectDef: JSONSchemaTypedObjectDefinition,
        objectIdentifier: string,
        rawName: string,
        options: JSONSchemaVisitOptions
    ) {
        const specificType = this.getSpecificTypeByIdentifier(objectIdentifier, options);
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
                    this.cache.typesByNames.set(existingType.name, existingType);
                }
            }
            // If this name should be prefixed
            if (this.cache.prefixedNames.has(name)) {
                name = pascalCase(options.prefix + '_' + name);
            }

            const outputType = new GraphQLObjectType({
                name,
                description: objectDef.description,
                fields: this.createFieldsMapFromProperties(objectDef.properties, {
                    ...options,
                    isInput: false,
                }),
            });
            this.cache.outputSpecificTypesByIdentifier.set(objectIdentifier, outputType);
            this.cache.typesByNames.set(outputType.name, outputType);
            this.cache.potentialPrefixes.set(outputType, options.prefix);

            const inputType = new GraphQLInputObjectType({
                name: pascalCase(name + '_Input'),
                description: objectDef.description,
                fields: this.createFieldsMapFromProperties(objectDef.properties, {
                    ...options,
                    isInput: true,
                }),
            });
            this.cache.inputSpecificTypesByIdentifier.set(objectIdentifier, inputType);
            this.cache.typesByNames.set(inputType.name, inputType);
            this.cache.potentialPrefixes.set(inputType, options.prefix);
            return options.isInput ? inputType : outputType;
        }
        return specificType;
    }
    visitTypedUnnamedObjectDefinition(typedUnnamedObjectDef: JSONSchemaTypedUnnamedObjectDefinition, options: JSONSchemaVisitOptions) {
        const objectIdentifier = 'id' in typedUnnamedObjectDef ? typedUnnamedObjectDef.id : typedUnnamedObjectDef.$id;
        const name = this.getNameFromId(objectIdentifier);
        return this.getGraphQLObjectTypeWithTypedObjectDef(typedUnnamedObjectDef, objectIdentifier, name, options);
    }
    visitTypedNamedObjectDefinition(typedNamedObjectDef: JSONSchemaTypedNamedObjectDefinition, options: JSONSchemaVisitOptions) {
        const objectIdentifier = typedNamedObjectDef.name;
        const name = pascalCase(objectIdentifier);
        return this.getGraphQLObjectTypeWithTypedObjectDef(typedNamedObjectDef, objectIdentifier, name, options);
    }
    visitObjectReference(objectRef: JSONSchemaObjectReference, propertyName: string, options: JSONSchemaVisitOptions) {
        const referenceParts = objectRef.$ref.split('/');
        const reference = referenceParts[referenceParts.length - 1];
        const specificType = this.getSpecificTypeByIdentifier(reference, options);
        if (!specificType) {
            console.warn(`${reference} Not Found in JSON Schema!`);
            return this.visitAny();
        }
        return specificType;
    }
    visitAny() {
        return GraphQLJSON;
    }
}
