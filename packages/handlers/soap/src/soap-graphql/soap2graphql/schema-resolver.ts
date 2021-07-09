import { SchemaOptions } from './soap2graphql';
import { defaultOutputNameResolver, defaultInterfaceNameResolver, defaultInputNameResolver } from './name-resolver';
import { DefaultTypeResolver } from './custom-type-resolver';
import {
  SoapEndpoint,
  SoapService,
  SoapPort,
  SoapOperation,
  SoapField,
  SoapType,
  SoapObjectType,
} from './soap-endpoint';
import { SoapCaller } from './soap-caller';
import { inspect } from 'util';
import {
  GraphQLObjectType,
  Thunk,
  GraphQLFieldConfigMap,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLOutputType,
  GraphQLFieldResolver,
  GraphQLResolveInfo,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLObjectTypeConfig,
  GraphQLInterfaceTypeConfig,
  GraphQLInputType,
  GraphQLInputObjectType,
  GraphQLInputObjectTypeConfig,
  GraphQLInputFieldConfigMap,
  GraphQLSchemaConfig,
  GraphQLString,
} from 'graphql';
import { Logger } from '@graphql-mesh/types';

export class SchemaResolver {
  private readonly options: SchemaOptions;

  private outputResolver: GraphqlOutputFieldResolver = null;
  private inputResolver: GraphqlInputFieldResolver = null;

  constructor(
    private soapEndpoint: SoapEndpoint,
    private soapCaller: SoapCaller,
    options: SchemaOptions,
    private logger: Logger
  ) {
    this.options = this.defaultOptions(options);
  }

  defaultOptions(options: SchemaOptions) {
    options = !options ? {} : Object.assign({}, options);

    if (!options.outputNameResolver) {
      options.outputNameResolver = defaultOutputNameResolver;
    }
    if (!options.interfaceNameResolver) {
      options.interfaceNameResolver = defaultInterfaceNameResolver;
    }
    if (!options.inputNameResolver) {
      options.inputNameResolver = defaultInputNameResolver;
    }

    if (!options.customResolver) {
      options.customResolver = new DefaultTypeResolver();
    }

    return options;
  }

  resolve(): GraphQLSchemaConfig {
    this.outputResolver = new GraphqlOutputFieldResolver(this.options, this.logger);
    this.inputResolver = new GraphqlInputFieldResolver(this.options, this.logger);

    return {
      query: this.createQueryObject(),
      mutation: this.createMutationObject(),
    };
  }

  createQueryObject(): GraphQLObjectType {
    return new GraphQLObjectType({
      name: 'Query',
      fields: {
        description: {
          type: GraphQLString,
          resolve: () => {
            return this.soapEndpoint.description();
          },
        },
      },
    });
  }

  createMutationObject(): GraphQLObjectType {
    const fieldsThunk: Thunk<GraphQLFieldConfigMap<any, any>> = () => {
      const fields: GraphQLFieldConfigMap<any, any> = {};

      this.soapEndpoint.services().forEach((service: SoapService) => {
        if (this.options.includeServices) {
          fields[service.name()] = this.createSoapServiceField(service);
        } else if (this.options.includePorts) {
          service.ports().forEach((port: SoapPort) => {
            fields[port.name()] = this.createSoapPortField(service, port);
          });
        } else {
          service.ports().forEach((port: SoapPort) => {
            port.operations().forEach((operation: SoapOperation) => {
              fields[operation.name()] = this.createSoapOperationField(operation);
            });
          });
        }
      });

      return fields;
    };

    return new GraphQLObjectType({
      name: 'Mutation',
      fields: fieldsThunk,
    });
  }

  createSoapServiceField(service: SoapService): GraphQLFieldConfig<any, any> {
    const fieldsThunk: Thunk<GraphQLFieldConfigMap<any, any>> = () => {
      const fields: GraphQLFieldConfigMap<any, any> = {};

      service.ports().forEach((port: SoapPort) => {
        if (this.options.includePorts) {
          fields[port.name()] = this.createSoapPortField(service, port);
        } else {
          port.operations().forEach((operation: SoapOperation) => {
            fields[operation.name()] = this.createSoapOperationField(operation);
          });
        }
      });

      return fields;
    };

    const returnType = new GraphQLObjectType({
      name: service.name() + 'Service',
      description: `Service ${service.name()}`,
      fields: fieldsThunk,
    });

    return {
      type: returnType,
      description: `Service ${service.name()}`,
      resolve: () => {
        return {};
      },
    };
  }

  createSoapPortField(service: SoapService, port: SoapPort): GraphQLFieldConfig<any, any> {
    const fieldsThunk: Thunk<GraphQLFieldConfigMap<any, any>> = () => {
      const fields: GraphQLFieldConfigMap<any, any> = {};

      port.operations().forEach((operation: SoapOperation) => {
        fields[operation.name()] = this.createSoapOperationField(operation);
      });

      return fields;
    };

    const returnType = new GraphQLObjectType({
      name: port.name() + 'Port',
      description: `Port ${port.name()}, service ${service.name()}`,
      fields: fieldsThunk,
    });

    return {
      type: returnType,
      description: `Port ${port.name()}, service ${service.name()}`,
      resolve: () => {
        return {};
      },
    };
  }

  createSoapOperationField(operation: SoapOperation): GraphQLFieldConfig<any, any> {
    const args: GraphQLFieldConfigArgumentMap = this.createSoapOperationFieldArgs(operation);
    const returnType: GraphQLOutputType = this.resolveSoapOperationReturnType(operation);
    const resolver: GraphQLFieldResolver<any, any, any> = this.createSoapOperationFieldResolver(operation);
    return {
      type: returnType,
      description: `Operation ${operation.name()}, port ${operation.port().name()}, service ${operation
        .service()
        .name()}`,
      args: args,
      resolve: resolver,
    };
  }

  createSoapOperationFieldArgs(operation: SoapOperation): GraphQLFieldConfigArgumentMap {
    const args: GraphQLFieldConfigArgumentMap = {};
    operation.args().forEach((soapField: SoapField) => {
      args[soapField.name] = {
        type: this.inputResolver.resolve(soapField),
      };
    });
    return args;
  }

  resolveSoapOperationReturnType(operation: SoapOperation): GraphQLOutputType {
    return this.outputResolver.resolve(operation.output());
  }

  createSoapOperationFieldResolver<TSource, TContext>(
    operation: SoapOperation
  ): GraphQLFieldResolver<TSource, { [argName: string]: any }, TContext> {
    return async (
      graphqlSource: TSource,
      graphqlArgs: { [argName: string]: any },
      graphqlContext: TContext,
      graphqlInfo: GraphQLResolveInfo
    ) => {
      return this.soapCaller.call({
        operation: operation,
        graphqlSource: graphqlSource,
        graphqlArgs: graphqlArgs,
        graphqlContext: graphqlContext,
        graphqlInfo: graphqlInfo,
      });
    };
  }
}

class GraphqlOutputFieldResolver {
  private alreadyResolvedOutputTypes: Map<SoapType, GraphQLOutputType> = new Map();
  private alreadyResolvedInterfaceTypes: Map<SoapType, GraphQLInterfaceType> = new Map();

  constructor(private options: SchemaOptions, private logger: Logger) {}

  resolve(input: { type: SoapType; isList: boolean }): GraphQLOutputType {
    try {
      const type: GraphQLOutputType = this.resolveOutputType(input.type);
      return input.isList ? new GraphQLList(type) : type;
    } catch (err) {
      const errStacked = new Error(`could not resolve output type for ${inspect(input, false, 4)}`);
      errStacked.stack += '\nCaused by: ' + err.stack;
      throw errStacked;
    }
  }

  private resolveOutputType(soapType: SoapType): GraphQLOutputType {
    if (this.alreadyResolvedOutputTypes.has(soapType)) {
      return this.alreadyResolvedOutputTypes.get(soapType);
    }

    if (typeof soapType === 'string') {
      const customType: GraphQLOutputType = this.options.customResolver.outputType(soapType);
      if (customType) {
        this.alreadyResolvedOutputTypes.set(soapType, customType);
        return customType;
      }
    } else if (soapType?.name && soapType?.fields?.length > 0) {
      const objectType: GraphQLObjectType = this.createObjectType(soapType);
      if (objectType) {
        this.alreadyResolvedOutputTypes.set(soapType, objectType);
        return objectType;
      }
    }

    this.logger.warn(`could not resolve output type '${soapType}'; using GraphQLString instead`);
    this.alreadyResolvedOutputTypes.set(soapType, GraphQLString);
    return GraphQLString;
  }

  private createObjectType(soapType: SoapObjectType): GraphQLObjectType {
    return new GraphQLObjectType(this.createObjectTypeConfig(soapType));
  }

  private createObjectTypeConfig(soapType: SoapObjectType): GraphQLObjectTypeConfig<any, any> {
    const fields: Thunk<GraphQLFieldConfigMap<any, any>> = () => {
      const fieldMap: GraphQLFieldConfigMap<any, any> = {};
      this.appendObjectTypeFields(fieldMap, soapType);
      return fieldMap;
    };

    const interfaces: Thunk<GraphQLInterfaceType[]> = () => {
      const interfaces: GraphQLInterfaceType[] = [];
      this.appendInterfaces(interfaces, soapType);
      return interfaces;
    };

    return {
      name: this.options.outputNameResolver(soapType),
      fields: fields,
      interfaces: interfaces,
    };
  }

  private appendObjectTypeFields(fieldMap: GraphQLFieldConfigMap<any, any>, soapType: SoapObjectType): void {
    soapType.fields.forEach((soapField: SoapField) => {
      fieldMap[soapField.name] = {
        type: this.resolve(soapField),
      };
    });
    if (soapType.base) {
      this.appendObjectTypeFields(fieldMap, soapType.base);
    }
  }

  private appendInterfaces(interfaces: GraphQLInterfaceType[], soapType: SoapObjectType): void {
    if (soapType.base) {
      interfaces.push(this.resolveInterfaceType(soapType.base));
      this.appendInterfaces(interfaces, soapType.base);
    }
  }

  private resolveInterfaceType(soapType: SoapObjectType): GraphQLInterfaceType {
    if (this.alreadyResolvedInterfaceTypes.has(soapType)) {
      return this.alreadyResolvedInterfaceTypes.get(soapType);
    }

    const interfaceType: GraphQLInterfaceType = this.createInterfaceType(soapType);
    this.alreadyResolvedInterfaceTypes.set(soapType, interfaceType);
    return interfaceType;
  }

  private createInterfaceType(soapType: SoapObjectType): GraphQLInterfaceType {
    return new GraphQLInterfaceType(this.createInterfaceTypeConfig(soapType));
  }

  private createInterfaceTypeConfig(soapType: SoapObjectType): GraphQLInterfaceTypeConfig<any, any> {
    const fields: Thunk<GraphQLFieldConfigMap<any, any>> = () => {
      const fieldMap: GraphQLFieldConfigMap<any, any> = {};
      this.appendInterfaceTypeFields(fieldMap, soapType);
      return fieldMap;
    };

    return {
      name: this.options.interfaceNameResolver(soapType),
      fields: fields,
      // should never be called, since the schema will not contain ambigous return types
      resolveType: (value: any, context: any, info: GraphQLResolveInfo) => {
        throw Error('no interface resolving available');
      },
    };
  }

  private appendInterfaceTypeFields(fieldMap: GraphQLFieldConfigMap<any, any>, soapType: SoapObjectType): void {
    soapType.fields.forEach((soapField: SoapField) => {
      fieldMap[soapField.name] = {
        type: this.resolve(soapField),
      };
    });
    if (soapType.base) {
      this.appendObjectTypeFields(fieldMap, soapType.base);
    }
  }
}

class GraphqlInputFieldResolver {
  private alreadyResolved: Map<SoapType, GraphQLInputType> = new Map();

  constructor(private options: SchemaOptions, private logger: Logger) {}

  resolve(input: { type: SoapType; isList: boolean }): GraphQLInputType {
    try {
      const type: GraphQLInputType = this.resolveInputType(input.type);
      return input.isList ? new GraphQLList(type) : type;
    } catch (err) {
      const errStacked = new Error(`could not resolve output type for ${inspect(input, false, 4)}`);
      errStacked.stack += '\nCaused by: ' + err.stack;
      throw errStacked;
    }
  }

  private resolveInputType(soapType: SoapType): GraphQLInputType {
    if (this.alreadyResolved.has(soapType)) {
      return this.alreadyResolved.get(soapType);
    }

    if (typeof soapType === 'string') {
      const customType: GraphQLInputType = this.options.customResolver.inputType(soapType);
      if (customType) {
        this.alreadyResolved.set(soapType, customType);
        return customType;
      }
    } else if (soapType?.name && soapType?.fields?.length > 0) {
      const objectType: GraphQLInputObjectType = this.createObjectType(soapType);
      if (objectType) {
        this.alreadyResolved.set(soapType, objectType);
        return objectType;
      }
    }

    this.logger.warn(`could not resolve input type '${soapType}'; using GraphQLString`);
    this.alreadyResolved.set(soapType, GraphQLString);
    return GraphQLString;
  }

  private createObjectType(soapType: SoapObjectType): GraphQLInputObjectType {
    return new GraphQLInputObjectType(this.createObjectTypeConfig(soapType));
  }

  private createObjectTypeConfig(soapType: SoapObjectType): GraphQLInputObjectTypeConfig {
    const fields: Thunk<GraphQLInputFieldConfigMap> = () => {
      const fieldMap: GraphQLInputFieldConfigMap = {};
      this.appendObjectTypeFields(fieldMap, soapType);
      return fieldMap;
    };

    return {
      name: this.options.inputNameResolver(soapType),
      fields: fields,
    };
  }

  private appendObjectTypeFields(fieldMap: GraphQLInputFieldConfigMap, soapType: SoapObjectType): void {
    soapType.fields.forEach((soapField: SoapField) => {
      fieldMap[soapField.name] = {
        type: this.resolve(soapField),
      };
    });
    if (soapType.base) {
      this.appendObjectTypeFields(fieldMap, soapType.base);
    }
  }
}
