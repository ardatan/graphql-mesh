// eslint-disable-next-line import/no-nodejs-modules
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { GraphQLScalarType } from 'graphql';
import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLString,
} from 'graphql';
import type {
  AnyTypeComposer,
  EnumTypeComposer,
  EnumTypeComposerValueConfigDefinition,
  InputTypeComposer,
  InputTypeComposerFieldConfigMapDefinition,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfigDefinition,
  ScalarTypeComposer,
} from 'graphql-compose';
import { GraphQLJSON, SchemaComposer } from 'graphql-compose';
import {
  GraphQLBigInt,
  GraphQLByte,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLDuration,
  GraphQLHexadecimal,
  GraphQLNegativeInt,
  GraphQLNonNegativeInt,
  GraphQLNonPositiveInt,
  GraphQLPositiveInt,
  GraphQLTime,
  GraphQLUnsignedInt,
  GraphQLURL,
  GraphQLVoid,
  RegularExpression,
} from 'graphql-scalars';
import { process } from '@graphql-mesh/cross-helpers';
import type { ResolverDataBasedFactory } from '@graphql-mesh/string-interpolation';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import type { Logger, MeshFetch } from '@graphql-mesh/types';
import {
  defaultImportFn,
  DefaultLogger,
  readFileOrUrl,
  sanitizeNameForGraphQL,
} from '@graphql-mesh/utils';
import { fetch as defaultFetchFn } from '@whatwg-node/fetch';
import type {
  WSDLBinding,
  WSDLDefinition,
  WSDLMessage,
  WSDLObject,
  WSDLPartAttributes,
  WSDLPortType,
  XSComplexType,
  XSDObject,
  XSElement,
  XSElementAttributes,
  XSExtensionAttributes,
  XSSchema,
  XSSimpleType,
} from './types.js';
import type { SoapAnnotations } from './utils.js';
import { PARSE_XML_OPTIONS } from './utils.js';

export interface SOAPLoaderOptions {
  subgraphName: string;
  fetch?: MeshFetch;
  logger?: Logger;
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
  soapHeaders?: SOAPHeaders;
  endpoint?: string;
  cwd?: string;
  bodyAlias?: string;
  soapNamespace?: string;
}

export interface SOAPHeaders {
  /**
   * The namespace of the SOAP Header
   *
   * @example http://www.example.com/namespace
   */
  namespace: string;
  /**
   * The name of the alias to be used in the envelope
   *
   * @default header
   */
  alias?: string;
  /**
   * The content of the SOAP Header
   *
   * @example { "key": "value" }
   *
   * then the content will be `<key>value</key>` in XML
   */
  headers: unknown;
}

const SOAPHeadersInput = new GraphQLInputObjectType({
  name: 'SOAPHeaders',
  fields: {
    namespace: {
      type: GraphQLString,
    },
    alias: {
      type: GraphQLString,
    },
    headers: {
      type: ObjMapScalar,
    },
  },
});

const soapDirective = new GraphQLDirective({
  name: 'soap',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    elementName: {
      type: GraphQLString,
    },
    bindingNamespace: {
      type: GraphQLString,
    },
    endpoint: {
      type: GraphQLString,
    },
    subgraph: {
      type: GraphQLString,
    },
    bodyAlias: {
      type: GraphQLString,
    },
    soapHeaders: {
      type: SOAPHeadersInput,
    },
    soapAction: {
      type: GraphQLString,
    },
    soapNamespace: {
      type: GraphQLString,
    },
  },
});

const QUERY_PREFIXES = [
  'get',
  'find',
  'list',
  'search',
  'count',
  'exists',
  'fetch',
  'load',
  'query',
  'select',
];

function isQueryOperationName(operationName: string) {
  return QUERY_PREFIXES.some(prefix => operationName.toLowerCase().startsWith(prefix));
}

/**
 * Resolve a (possibly relative) WSDL/XSD location against the location of the
 * document doing the import. Mirrors XML Schema's xml:base resolution rules:
 * relative `schemaLocation` / `wsdl:import location` is resolved against the
 * importing document's own URI, not against a fixed root.
 *
 * Handles both URLs (http/https/file) and filesystem paths uniformly.
 */
function resolveLocation(base: string | undefined, location: string): string {
  // Already-absolute URLs and absolute filesystem paths pass through.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(location)) return location;
  if (isAbsolute(location)) return location;
  if (!base) return location;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(base)) {
    // base is a URL — let URL handle "../" and similar.
    return new URL(location, base).href;
  }
  // base is a filesystem path — resolve relative to its containing directory.
  return resolvePath(dirname(base), location);
}

/**
 * Convert a namespace URI to a GraphQL-safe identifier slug.
 * Uses a single linear pass to avoid polynomial regex backtracking on
 * user-controlled input (CodeQL js/polynomial-redos).
 */
function namespaceToSlug(namespace: string): string {
  // Determine start index after optional protocol prefix
  let start = 0;
  if (namespace.startsWith('https://')) {
    start = 8;
  } else if (namespace.startsWith('http://')) {
    start = 7;
  }

  // Build slug in one pass:
  // - keep alphanumeric characters as-is
  // - collapse any run of non-alphanumeric characters into a single '_'
  // - skip leading and trailing '_' (pendingUnderscore is only flushed when
  //   a subsequent alphanumeric character is found)
  // Use an array of chunks to avoid O(n^2) repeated string concatenation.
  const chunks: string[] = [];
  let pendingUnderscore = false;
  for (let i = start; i < namespace.length; i++) {
    const code = namespace.charCodeAt(i);
    if (
      (code >= 0x30 && code <= 0x39) || // 0-9
      (code >= 0x41 && code <= 0x5a) || // A-Z
      (code >= 0x61 && code <= 0x7a) // a-z
    ) {
      if (pendingUnderscore && chunks.length > 0) {
        chunks.push('_');
      }
      pendingUnderscore = false;
      chunks.push(namespace[i]);
    } else {
      pendingUnderscore = true;
    }
  }

  // If nothing was accumulated (e.g. namespace is symbols-only or empty after
  // stripping the protocol prefix), return a safe sentinel so callers always
  // receive a non-empty, GraphQL-Name-compatible string.
  if (chunks.length === 0) {
    return '_';
  }

  // Prefix a leading digit so the result is a valid GraphQL identifier
  const firstCode = chunks[0].charCodeAt(0);
  if (firstCode >= 0x30 && firstCode <= 0x39) {
    chunks.unshift('_');
  }

  return chunks.join('');
}

export class SOAPLoader {
  private schemaComposer = new SchemaComposer();
  private namespaceDefinitionsMap = new Map<string, WSDLDefinition[]>();
  private namespaceComplexTypesMap = new Map<string, Map<string, XSComplexType>>();
  private namespaceSimpleTypesMap = new Map<string, Map<string, XSSimpleType>>();
  private namespacePortTypesMap = new Map<string, Map<string, WSDLPortType>>();
  private namespaceBindingMap = new Map<string, Map<string, WSDLBinding>>();
  private namespaceMessageMap = new Map<string, Map<string, WSDLMessage>>();
  private aliasMap = new WeakMap<any, Map<string, string>>();
  private messageOutputTCMap = new WeakMap<
    WSDLMessage,
    {
      type: () => ObjectTypeComposer | ScalarTypeComposer | EnumTypeComposer;
      elementName: string;
    }
  >();

  private complexTypeInputTCMap = new WeakMap<
    XSComplexType,
    InputTypeComposer | ScalarTypeComposer
  >();

  private complexTypeOutputTCMap = new WeakMap<
    XSComplexType,
    ObjectTypeComposer | ScalarTypeComposer
  >();

  private simpleTypeTCMap = new WeakMap<XSSimpleType, EnumTypeComposer | ScalarTypeComposer>();
  private namespaceTypePrefixMap = new Map<string, string>();
  private namespaceElementRefMap = new Map<
    string,
    Map<string, { typeName: string; typeNamespace: string }>
  >();

  public loadedLocations = new Map<string, WSDLObject | XSDObject>();
  private schemaHeadersFactory: ResolverDataBasedFactory<Record<string, string>>;
  private fetchFn: MeshFetch;
  private subgraphName: string;
  private logger: Logger;
  private endpoint?: string;
  private cwd: string;
  private soapHeaders: SOAPHeaders;
  private bodyAlias?: string;
  private soapNamespace: string;

  constructor(options: SOAPLoaderOptions) {
    this.fetchFn = options.fetch || defaultFetchFn;
    this.logger = options.logger || new DefaultLogger(options.subgraphName);
    this.subgraphName = options.subgraphName;
    this.loadXMLSchemaNamespace();
    this.schemaComposer.addDirective(soapDirective);
    this.schemaHeadersFactory = getInterpolatedHeadersFactory(options.schemaHeaders || {});
    this.endpoint = options.endpoint;
    this.cwd = options.cwd;
    this.soapHeaders = options.soapHeaders;
    this.bodyAlias = options.bodyAlias;
    this.soapNamespace = 'http://schemas.xmlsoap.org/soap/envelope/';
  }

  loadXMLSchemaNamespace() {
    const namespace = 'http://www.w3.org/2001/XMLSchema';
    const simpleTypeGraphQLScalarMap = new Map<string, GraphQLScalarType>([
      ['anyType', GraphQLJSON],
      ['anySimpleType', GraphQLString],
      ['anyURI', GraphQLURL],
      ['base64Binary', GraphQLByte],
      ['byte', GraphQLByte],
      ['boolean', GraphQLBoolean],
      ['date', GraphQLDate],
      ['dateTime', GraphQLDateTime],
      ['decimal', GraphQLFloat],
      ['double', GraphQLFloat],
      ['duration', GraphQLDuration],
      ['float', GraphQLFloat],
      ['int', GraphQLInt],
      ['integer', GraphQLInt],
      ['negativeInteger', GraphQLNegativeInt],
      ['nonNegativeInteger', GraphQLNonNegativeInt],
      ['nonPositiveInteger', GraphQLNonPositiveInt],
      ['positiveInteger', GraphQLPositiveInt],
      ['hexBinary', GraphQLHexadecimal],
      ['long', GraphQLBigInt],
      ['gDay', GraphQLString],
      ['gMonth', GraphQLString],
      ['gMonthDay', GraphQLString],
      ['gYear', GraphQLString],
      ['gYearMonth', GraphQLString],
      ['NOTATION', GraphQLString],
      ['QName', GraphQLString],
      ['short', GraphQLInt],
      ['string', GraphQLString],
      ['unsignedByte', GraphQLByte],
      ['unsignedInt', GraphQLUnsignedInt],
      ['unsignedLong', GraphQLBigInt],
      ['unsignedShort', GraphQLUnsignedInt],
      ['time', GraphQLTime],
    ]);
    const namespaceSimpleTypesMap = this.getNamespaceSimpleTypeMap(namespace);
    for (const [singleTypeName, scalarType] of simpleTypeGraphQLScalarMap) {
      const singleType: any = {
        attributes: {
          name: singleTypeName,
        },
      };
      namespaceSimpleTypesMap.set(singleTypeName, singleType);
      const simpleTypeTC = this.schemaComposer.createScalarTC(scalarType);
      this.simpleTypeTCMap.set(singleType, simpleTypeTC);
    }
  }

  private getNamespaceDefinitions(namespace: string) {
    let namespaceDefinitions = this.namespaceDefinitionsMap.get(namespace);
    if (!namespaceDefinitions) {
      namespaceDefinitions = [];
      this.namespaceDefinitionsMap.set(namespace, namespaceDefinitions);
    }
    return namespaceDefinitions;
  }

  private getNamespaceComplexTypeMap(namespace: string) {
    let namespaceComplexTypes = this.namespaceComplexTypesMap.get(namespace);
    if (!namespaceComplexTypes) {
      namespaceComplexTypes = new Map();
      this.namespaceComplexTypesMap.set(namespace, namespaceComplexTypes);
    }
    return namespaceComplexTypes;
  }

  private getNamespaceSimpleTypeMap(namespace: string) {
    let namespaceSimpleTypes = this.namespaceSimpleTypesMap.get(namespace);
    if (!namespaceSimpleTypes) {
      namespaceSimpleTypes = new Map();
      this.namespaceSimpleTypesMap.set(namespace, namespaceSimpleTypes);
    }
    return namespaceSimpleTypes;
  }

  private getNamespacePortTypeMap(namespace: string) {
    let namespacePortTypes = this.namespacePortTypesMap.get(namespace);
    if (!namespacePortTypes) {
      namespacePortTypes = new Map();
      this.namespacePortTypesMap.set(namespace, namespacePortTypes);
    }
    return namespacePortTypes;
  }

  private getNamespaceBindingMap(namespace: string) {
    let namespaceBindingMap = this.namespaceBindingMap.get(namespace);
    if (!namespaceBindingMap) {
      namespaceBindingMap = new Map();
      this.namespaceBindingMap.set(namespace, namespaceBindingMap);
    }
    return namespaceBindingMap;
  }

  private getNamespaceMessageMap(namespace: string) {
    let namespaceMessageMap = this.namespaceMessageMap.get(namespace);
    if (!namespaceMessageMap) {
      namespaceMessageMap = new Map();
      this.namespaceMessageMap.set(namespace, namespaceMessageMap);
    }
    return namespaceMessageMap;
  }

  async loadSchema(
    schemaObj: XSSchema,
    parentAliasMap: Map<string, string> = new Map(),
    baseUrl?: string,
  ) {
    // A bare <xsd:schema> wrapper that only contains imports (no targetNamespace,
    // no type definitions) is a valid pattern — it lets a WSDL pull external
    // schemas into its <wsdl:types> without redefining anything itself. Process
    // its imports and return; there's nothing else to register.
    if (!schemaObj.attributes || !schemaObj.attributes.targetNamespace) {
      if (schemaObj.import) {
        for (const importObj of schemaObj.import) {
          const importLocation = importObj.attributes.schemaLocation;
          if (importLocation) {
            await this.fetchXSD(importLocation, parentAliasMap, baseUrl);
          }
        }
      }
      return;
    }
    const schemaNamespace = schemaObj.attributes.targetNamespace;
    const aliasMap = this.getAliasMapFromAttributes(schemaObj.attributes);
    let typePrefix = this.namespaceTypePrefixMap.get(schemaNamespace);
    if (!typePrefix) {
      typePrefix =
        schemaObj.attributes.id ||
        [...aliasMap.entries()].find(([, namespace]) => namespace === schemaNamespace)?.[0];
      this.namespaceTypePrefixMap.set(schemaNamespace, typePrefix);
    }
    for (const [alias, namespace] of parentAliasMap) {
      if (!aliasMap.has(alias)) {
        aliasMap.set(alias, namespace);
      }
    }
    if (schemaObj.import) {
      for (const importObj of schemaObj.import) {
        const importLocation = importObj.attributes.schemaLocation;
        if (importLocation) {
          await this.fetchXSD(importLocation, parentAliasMap, baseUrl);
        }
      }
    }
    // Complex and simple types can be inside element tag or outside of it
    if (schemaObj.complexType) {
      const namespaceComplexTypes = this.getNamespaceComplexTypeMap(schemaNamespace);
      for (const complexType of schemaObj.complexType) {
        namespaceComplexTypes.set(complexType.attributes.name, complexType);
        this.aliasMap.set(complexType, aliasMap);
      }
    }
    if (schemaObj.simpleType) {
      const namespaceSimpleTypes = this.getNamespaceSimpleTypeMap(schemaNamespace);
      for (const simpleType of schemaObj.simpleType) {
        namespaceSimpleTypes.set(simpleType.attributes.name, simpleType);
        this.aliasMap.set(simpleType, aliasMap);
      }
    }
    if (schemaObj.element) {
      for (const elementObj of schemaObj.element) {
        if (elementObj.complexType) {
          const namespaceComplexTypes = this.getNamespaceComplexTypeMap(schemaNamespace);
          for (const complexType of elementObj.complexType) {
            // Sometimes type name is defined on element object
            complexType.attributes = complexType.attributes || ({} as any);
            complexType.attributes.name = elementObj.attributes.name;
            namespaceComplexTypes.set(complexType.attributes.name, complexType);
            this.aliasMap.set(complexType, aliasMap);
          }
        }
        if (elementObj.simpleType) {
          const namespaceSimpleTypes = this.getNamespaceSimpleTypeMap(schemaNamespace);
          for (const simpleType of elementObj.simpleType) {
            simpleType.attributes = simpleType.attributes || ({} as any);
            simpleType.attributes.name = elementObj.attributes.name;
            namespaceSimpleTypes.set(simpleType.attributes.name, simpleType);
            this.aliasMap.set(simpleType, aliasMap);
          }
        }
        if (elementObj.attributes?.type) {
          const [refTypeNamespaceAlias, refTypeName] = elementObj.attributes.type.split(':');
          const refTypeNamespace = aliasMap.get(refTypeNamespaceAlias);
          if (!refTypeNamespace) {
            throw new Error(`Invalid namespace alias: ${refTypeNamespaceAlias}`);
          }
          const refComplexType = this.getNamespaceComplexTypeMap(refTypeNamespace).get(refTypeName);
          if (refComplexType) {
            this.getNamespaceComplexTypeMap(schemaNamespace).set(
              elementObj.attributes.name,
              refComplexType,
            );
          }
          const refSimpleType = this.getNamespaceSimpleTypeMap(refTypeNamespace).get(refTypeName);
          if (refSimpleType) {
            this.getNamespaceSimpleTypeMap(schemaNamespace).set(
              elementObj.attributes.name,
              refSimpleType,
            );
          }
          if (!refComplexType && !refSimpleType) {
            // Forward reference: referenced type not yet loaded. Store for lazy lookup.
            let elementRefs = this.namespaceElementRefMap.get(schemaNamespace);
            if (!elementRefs) {
              elementRefs = new Map();
              this.namespaceElementRefMap.set(schemaNamespace, elementRefs);
            }
            elementRefs.set(elementObj.attributes.name, {
              typeName: refTypeName,
              typeNamespace: refTypeNamespace,
            });
          }
        }
      }
    }
  }

  async loadDefinition(definition: WSDLDefinition, baseUrl?: string) {
    this.getNamespaceDefinitions(definition.attributes.targetNamespace).push(definition);
    if (definition.attributes.soap12) {
      this.soapNamespace = 'http://www.w3.org/2003/05/soap-envelope';
    }
    const definitionAliasMap = this.getAliasMapFromAttributes(definition.attributes);
    const definitionNamespace = definition.attributes.targetNamespace;
    const typePrefix =
      definition.attributes.name ||
      [...definitionAliasMap.entries()].find(
        ([, namespace]) => namespace === definitionNamespace,
      )?.[0] ||
      '';
    this.namespaceTypePrefixMap.set(definition.attributes.targetNamespace, typePrefix);
    if (definition.import) {
      for (const importObj of definition.import) {
        const importLocation = importObj.attributes.location;
        if (importLocation) {
          await this.fetchWSDL(importLocation, baseUrl);
        }
      }
    }
    if (definition.types) {
      for (const typesObj of definition.types) {
        for (const schemaObj of typesObj.schema) {
          await this.loadSchema(schemaObj, definitionAliasMap, baseUrl);
        }
      }
    }
    if (definition.portType) {
      const namespacePortTypes = this.getNamespacePortTypeMap(
        definition.attributes.targetNamespace,
      );
      for (const portTypeObj of definition.portType) {
        namespacePortTypes.set(portTypeObj.attributes.name, portTypeObj);
        this.aliasMap.set(portTypeObj, definitionAliasMap);
      }
    }
    if (definition.binding) {
      const namespaceBindingMap = this.getNamespaceBindingMap(
        definition.attributes.targetNamespace,
      );
      for (const bindingObj of definition.binding) {
        namespaceBindingMap.set(bindingObj.attributes.name, bindingObj);
        this.aliasMap.set(bindingObj, definitionAliasMap);
      }
    }
    if (definition.message) {
      const namespaceMessageMap = this.getNamespaceMessageMap(
        definition.attributes.targetNamespace,
      );
      for (const messageObj of definition.message) {
        namespaceMessageMap.set(messageObj.attributes.name, messageObj);
        this.aliasMap.set(messageObj, definitionAliasMap);
      }
    }
    const serviceAndPortAliasMap = this.getAliasMapFromAttributes(definition.attributes);
    if (definition.service) {
      for (const serviceObj of definition.service) {
        const serviceName = serviceObj.attributes.name;
        for (const portObj of serviceObj.port) {
          const portName = portObj.attributes.name;
          const [bindingNamespaceAlias, bindingName] = portObj.attributes.binding.split(':');
          const bindingNamespace = serviceAndPortAliasMap.get(bindingNamespaceAlias);
          if (!bindingNamespace) {
            throw new Error(`Namespace alias: ${bindingNamespaceAlias} is undefined!`);
          }
          const bindingObj = this.getNamespaceBindingMap(bindingNamespace).get(bindingName);
          if (!bindingObj) {
            throw new Error(
              `Binding: ${bindingName} is not defined in ${bindingNamespace} needed for ${serviceName}->${portName}`,
            );
          }
          const bindingAliasMap = this.aliasMap.get(bindingObj);
          if (!bindingAliasMap) {
            throw new Error(`Namespace alias definitions couldn't be found for ${bindingName}`);
          }
          const [portTypeNamespaceAlias, portTypeName] = bindingObj.attributes.type.split(':');
          const portTypeNamespace = bindingAliasMap.get(portTypeNamespaceAlias);
          if (!portTypeNamespace) {
            throw new Error(`Namespace alias: ${portTypeNamespaceAlias} is undefined!`);
          }
          const portTypeObj = this.getNamespacePortTypeMap(portTypeNamespace).get(portTypeName);
          if (!portTypeObj) {
            throw new Error(
              `Port Type: ${portTypeName} is not defined in ${portTypeNamespace} needed for ${bindingNamespaceAlias}->${bindingName}`,
            );
          }
          const portTypeAliasMap = this.aliasMap.get(portTypeObj);
          for (const operationObj of portTypeObj.operation) {
            const operationName = operationObj.attributes.name;
            const rootTC = isQueryOperationName(operationName)
              ? this.schemaComposer.Query
              : this.schemaComposer.Mutation;
            const operationFieldName = sanitizeNameForGraphQL(
              `${typePrefix}_${serviceName}_${portName}_${operationName}`,
            );
            const outputObj = operationObj.output[0];
            const [messageNamespaceAlias, messageName] = outputObj.attributes.message.split(':');
            const messageNamespace = portTypeAliasMap.get(messageNamespaceAlias);
            if (!messageNamespace) {
              throw new Error(`Namespace alias: ${messageNamespaceAlias} is undefined!`);
            }
            const { type, elementName } = this.getOutputTypeForMessage(
              this.getNamespaceMessageMap(messageNamespace).get(messageName),
            );
            const bindingOperationObject = bindingObj.operation.find(
              operation => operation.attributes.name === operationName,
            );
            const soapAnnotations: SoapAnnotations = {
              elementName,
              bindingNamespace,
              endpoint: this.endpoint,
              subgraph: this.subgraphName,
              soapNamespace: this.soapNamespace,
            };
            if (!soapAnnotations.endpoint && portObj.address) {
              for (const address of portObj.address) {
                if (address.attributes) {
                  for (const attributeName in address.attributes) {
                    const value = address.attributes[attributeName];
                    if (value && attributeName.toLowerCase().endsWith('location')) {
                      soapAnnotations.endpoint = value;
                      break;
                    }
                  }
                }
              }
            }
            if (bindingOperationObject?.operation) {
              for (const bindingOperationObjectElem of bindingOperationObject.operation) {
                if (bindingOperationObjectElem.attributes) {
                  for (const attributeName in bindingOperationObjectElem.attributes) {
                    const value = bindingOperationObjectElem.attributes[attributeName];
                    if (value && attributeName.toLowerCase().endsWith('action')) {
                      soapAnnotations.soapAction = value;
                      break;
                    }
                  }
                }
              }
            }
            if (this.bodyAlias) {
              soapAnnotations.bodyAlias = this.bodyAlias;
            }
            if (this.soapHeaders) {
              soapAnnotations.soapHeaders = this.soapHeaders;
            }
            rootTC.addFields({
              [operationFieldName]: {
                type,
                directives: [
                  {
                    name: 'soap',
                    args: soapAnnotations,
                  },
                ],
              },
            });
            const inputObj = operationObj.input[0];
            const [inputMessageNamespaceAlias, inputMessageName] =
              inputObj.attributes.message.split(':');
            const inputMessageNamespace = portTypeAliasMap.get(inputMessageNamespaceAlias);
            if (!inputMessageNamespace) {
              throw new Error(`Namespace alias: ${inputMessageNamespaceAlias} is undefined!`);
            }
            const inputMessageObj =
              this.getNamespaceMessageMap(inputMessageNamespace).get(inputMessageName);
            if (!inputMessageObj) {
              throw new Error(
                `Message: ${inputMessageName} is not defined in ${inputMessageNamespace} needed for ${portTypeName}->${operationName}`,
              );
            }
            const aliasMap = this.aliasMap.get(inputMessageObj);
            for (const part of inputMessageObj.part) {
              if (part.attributes.element) {
                const [elementNamespaceAlias, elementName] = part.attributes.element.split(':');
                rootTC.addFieldArgs(operationFieldName, {
                  [sanitizeNameForGraphQL(elementName)]: {
                    type: () => {
                      const elementNamespace =
                        aliasMap.get(elementNamespaceAlias) ||
                        part.attributes[elementNamespaceAlias as keyof WSDLPartAttributes];
                      if (!elementNamespace) {
                        throw new Error(
                          `Namespace alias: ${elementNamespaceAlias} is not defined.`,
                        );
                      }
                      return this.getInputTypeForTypeNameInNamespace({
                        typeName: elementName,
                        typeNamespace: elementNamespace,
                      });
                    },
                    defaultValue: '',
                  },
                });
              } else if (part.attributes.name) {
                const partName = part.attributes.name;
                rootTC.addFieldArgs(operationFieldName, {
                  [sanitizeNameForGraphQL(partName)]: {
                    type: () => {
                      const typeRef = part.attributes.type;
                      const [typeNamespaceAlias, typeName] = typeRef.split(':');
                      const typeNamespace = aliasMap.get(typeNamespaceAlias);
                      if (!typeNamespace) {
                        throw new Error(`Namespace alias: ${typeNamespaceAlias} is undefined!`);
                      }
                      const inputTC = this.getInputTypeForTypeNameInNamespace({
                        typeName,
                        typeNamespace,
                      });
                      if ('getFields' in inputTC && Object.keys(inputTC.getFields()).length === 0) {
                        return GraphQLJSON;
                      }
                      return inputTC;
                    },
                    defaultValue: '',
                  },
                });
              }
            }
          }
        }
      }
    }
  }

  private xmlParser = new XMLParser(PARSE_XML_OPTIONS);

  async fetchXSD(location: string, parentAliasMap = new Map<string, string>(), baseUrl?: string) {
    const resolved = resolveLocation(baseUrl ?? this.cwd, location);
    if (this.loadedLocations.has(resolved)) return;
    let xsdText = await readFileOrUrl<string>(resolved, {
      allowUnknownExtensions: true,
      cwd: this.cwd,
      fetch: this.fetchFn,
      importFn: defaultImportFn,
      logger: this.logger,
      headers: this.schemaHeadersFactory({ env: process.env }),
    });
    xsdText = xsdText.split('xmlns:').join('namespace:');
    // WSDL Import is different than XS Import
    const xsdObj: XSDObject = this.xmlParser.parse(xsdText, PARSE_XML_OPTIONS);
    // Pre-register before recursing so circular imports terminate.
    this.loadedLocations.set(resolved, xsdObj);
    for (const schemaObj of xsdObj.schema) {
      await this.loadSchema(schemaObj, parentAliasMap, resolved);
    }
  }

  async loadWSDL(wsdlText: string, baseUrl?: string) {
    wsdlText = wsdlText.split('xmlns:').join('namespace:');
    let wsdlObject: WSDLObject;
    try {
      wsdlObject = this.xmlParser.parse(wsdlText, PARSE_XML_OPTIONS);
    } catch (e) {
      throw new Error(`Failed to parse WSDL: ${e.message}. \nReturned response;\n${wsdlText}`);
    }
    if (!Array.isArray(wsdlObject.definitions)) {
      throw new Error(
        `WSDL definitions not found! Please make sure if your WSDL source is correct, and it contains <definitions> tag.\nReturned response;\n${wsdlText}`,
      );
    }
    // Pre-register before recursing so circular imports terminate.
    if (baseUrl) {
      this.loadedLocations.set(baseUrl, wsdlObject);
    }
    for (const definition of wsdlObject.definitions) {
      await this.loadDefinition(definition, baseUrl);
    }
    return wsdlObject;
  }

  async fetchWSDL(location: string, baseUrl?: string) {
    const resolved = resolveLocation(baseUrl ?? this.cwd, location);
    if (this.loadedLocations.has(resolved)) return;
    const wsdlText = await readFileOrUrl<string>(resolved, {
      allowUnknownExtensions: true,
      cwd: this.cwd,
      fetch: this.fetchFn,
      importFn: defaultImportFn,
      logger: this.logger,
      headers: this.schemaHeadersFactory({ env: process.env }),
    });
    await this.loadWSDL(wsdlText, resolved);
  }

  getAliasMapFromAttributes(attributes: XSSchema['attributes'] | WSDLDefinition['attributes']) {
    const aliasMap = new Map<string, string>();
    for (const attributeName in attributes) {
      const attributeValue = attributes[attributeName];
      if (attributeName !== 'targetNamespace') {
        aliasMap.set(attributeName, attributeValue);
      }
    }
    return aliasMap;
  }

  getTypeForSimpleType(
    simpleType: XSSimpleType,
    simpleTypeNamespace: string,
  ): EnumTypeComposer | ScalarTypeComposer {
    let simpleTypeTC = this.simpleTypeTCMap.get(simpleType);
    if (!simpleTypeTC) {
      const simpleTypeName = sanitizeNameForGraphQL(simpleType.attributes.name);
      const restrictionObj = simpleType.restriction[0];
      const prefix = this.namespaceTypePrefixMap.get(simpleTypeNamespace);
      if (restrictionObj.enumeration) {
        const enumTypeName = `${prefix}_${simpleTypeName}`;
        const values: Record<string, Readonly<EnumTypeComposerValueConfigDefinition>> = {};
        for (const enumerationObj of restrictionObj.enumeration) {
          const enumValue = enumerationObj.attributes.value;
          const enumKey = sanitizeNameForGraphQL(enumValue);
          values[enumKey] = {
            value: enumValue,
          };
        }
        simpleTypeTC = this.schemaComposer.createEnumTC({
          name: enumTypeName,
          values,
        });
      } else if (restrictionObj.pattern) {
        const patternObj = restrictionObj.pattern[0];
        const pattern = patternObj.attributes.value;
        const scalarTypeName = `${prefix}_${simpleTypeName}`;
        simpleTypeTC = this.schemaComposer.createScalarTC(
          new RegularExpression(scalarTypeName, new RegExp(pattern)),
        );
      } else {
        // TODO: Other restrictions are not supported yet
        const aliasMap = this.aliasMap.get(simpleType);
        const [baseTypeNamespaceAlias, baseTypeName] = restrictionObj.attributes.base.split(':');
        const baseTypeNamespace = aliasMap.get(baseTypeNamespaceAlias);
        if (!baseTypeNamespace) {
          throw new Error(`Invalid base type namespace: ${baseTypeNamespaceAlias}`);
        }
        const baseType = this.getNamespaceSimpleTypeMap(baseTypeNamespace)?.get(baseTypeName);
        if (!baseType) {
          throw new Error(
            `Simple Type: ${baseTypeName} couldn't be found in ${baseTypeNamespace} needed for ${simpleTypeName}`,
          );
        }
        simpleTypeTC = this.getTypeForSimpleType(baseType, baseTypeNamespace);
      }
      this.simpleTypeTCMap.set(simpleType, simpleTypeTC);
    }
    return simpleTypeTC;
  }

  getInputTypeForTypeNameInNamespace({
    typeName,
    typeNamespace,
  }: {
    typeName: string;
    typeNamespace: string;
  }) {
    // Check element aliases first — consistent with the eager path that overwrites the type map
    const elementRef = this.namespaceElementRefMap.get(typeNamespace)?.get(typeName);
    if (elementRef) {
      return this.getInputTypeForTypeNameInNamespace(elementRef);
    }
    const complexType = this.getNamespaceComplexTypeMap(typeNamespace)?.get(typeName);
    if (complexType) {
      return this.getInputTypeForComplexType(complexType, typeNamespace);
    }
    const simpleType = this.getNamespaceSimpleTypeMap(typeNamespace)?.get(typeName);
    if (simpleType) {
      return this.getTypeForSimpleType(simpleType, typeNamespace);
    }
    throw new Error(`Type: ${typeName} couldn't be found in ${typeNamespace}`);
  }

  getInputTypeForComplexType(complexType: XSComplexType, complexTypeNamespace: string) {
    let complexTypeTC = this.complexTypeInputTCMap.get(complexType);
    if (!complexTypeTC) {
      const complexTypeName = sanitizeNameForGraphQL(complexType.attributes.name);
      const prefix = this.namespaceTypePrefixMap.get(complexTypeNamespace);
      const aliasMap = this.aliasMap.get(complexType);
      const fieldMap: InputTypeComposerFieldConfigMapDefinition = {};
      const choiceOrSequenceObjects = [
        ...(complexType.sequence || []),
        ...(complexType.choice || []),
      ];
      for (const sequenceOrChoiceObj of choiceOrSequenceObjects) {
        if (sequenceOrChoiceObj.element) {
          for (const elementObj of sequenceOrChoiceObj.element) {
            if (elementObj.attributes?.name) {
              const fieldName = sanitizeNameForGraphQL(elementObj.attributes.name);
              fieldMap[fieldName] = {
                type: () => {
                  const maxOccurs =
                    sequenceOrChoiceObj.attributes?.maxOccurs || elementObj.attributes?.maxOccurs;
                  const minOccurs =
                    sequenceOrChoiceObj.attributes?.minOccurs || elementObj.attributes?.minOccurs;
                  const nillable =
                    sequenceOrChoiceObj.attributes?.nillable || elementObj.attributes?.nillable;
                  const isPlural = maxOccurs != null && maxOccurs !== '1';
                  let isNullable = false;
                  if (minOccurs == null || minOccurs === '0') {
                    isNullable = true;
                  }
                  if (nillable === 'true') {
                    isNullable = true;
                  }
                  if (nillable === 'false') {
                    isNullable = false;
                  }
                  if (elementObj.attributes?.type) {
                    const [typeNamespaceAlias, typeName] = elementObj.attributes.type.split(
                      ':',
                    ) as [keyof XSElementAttributes, string];
                    let typeNamespace;
                    if (elementObj.attributes[typeNamespaceAlias]) {
                      typeNamespace = elementObj.attributes[typeNamespaceAlias];
                    } else {
                      typeNamespace = aliasMap.get(typeNamespaceAlias);
                    }
                    if (!typeNamespace) {
                      throw new Error(`Namespace alias: ${typeNamespaceAlias} is undefined!`);
                    }
                    let finalTC: AnyTypeComposer<any> = this.getInputTypeForTypeNameInNamespace({
                      typeName,
                      typeNamespace,
                    });
                    if (isPlural) {
                      finalTC = finalTC.getTypePlural();
                    }
                    if (!isNullable) {
                      finalTC = finalTC.getTypeNonNull();
                    }
                    return finalTC;
                  } else if (elementObj.simpleType) {
                    // eslint-disable-next-line no-unreachable-loop
                    for (const simpleTypeObj of elementObj.simpleType) {
                      // Dynamically defined simple type
                      // So we need to define alias map for this type
                      this.aliasMap.set(simpleTypeObj, aliasMap);
                      // Inherit the name from elementObj, scoped to the parent type name
                      // to avoid collisions when sibling types share an inline field name.
                      // Skip scoping when complexTypeName already equals the namespace prefix
                      // (i.e. it is a top-level-element anonymous type) to avoid double-prefixing
                      // like ByNameDataSet_ByNameDataSet_ByName.
                      simpleTypeObj.attributes = simpleTypeObj.attributes || ({} as any);
                      simpleTypeObj.attributes.name =
                        simpleTypeObj.attributes.name ||
                        (complexTypeName !== prefix
                          ? `${complexTypeName}_${elementObj.attributes.name}`
                          : elementObj.attributes.name);
                      let finalTC: AnyTypeComposer<any> = this.getTypeForSimpleType(
                        simpleTypeObj,
                        complexTypeNamespace,
                      );
                      if (isPlural) {
                        finalTC = finalTC.getTypePlural();
                      }
                      if (!isNullable) {
                        finalTC = finalTC.getTypeNonNull();
                      }
                      return finalTC;
                    }
                  } else if (elementObj.complexType) {
                    // eslint-disable-next-line no-unreachable-loop
                    for (const complexTypeObj of elementObj.complexType) {
                      // Dynamically defined type
                      // So we need to define alias map for this type
                      this.aliasMap.set(complexTypeObj, aliasMap);
                      // Inherit the name from elementObj, scoped to the parent type name
                      // to avoid collisions when sibling types share an inline field name.
                      // Skip scoping when complexTypeName already equals the namespace prefix
                      // (i.e. it is a top-level-element anonymous type) to avoid double-prefixing.
                      complexTypeObj.attributes = complexTypeObj.attributes || ({} as any);
                      complexTypeObj.attributes.name =
                        complexTypeObj.attributes.name ||
                        (complexTypeName !== prefix
                          ? `${complexTypeName}_${elementObj.attributes.name}`
                          : elementObj.attributes.name);
                      let finalTC: AnyTypeComposer<any> = this.getInputTypeForComplexType(
                        complexTypeObj,
                        complexTypeNamespace,
                      );
                      if (isPlural) {
                        finalTC = finalTC.getTypePlural();
                      }
                      if (!isNullable) {
                        finalTC = finalTC.getTypeNonNull();
                      }
                      return finalTC;
                    }
                  }
                  throw new Error(
                    `Invalid element type definition: ${complexTypeName}->${fieldName}`,
                  );
                },
              } as any;
            } else {
              if (elementObj.attributes?.ref) {
                this.logger.warn(`element.ref isn't supported yet.`);
              } else {
                this.logger.warn(`Element doesn't have a name in ${complexTypeName}. Ignoring...`);
              }
            }
          }
        }
        if (sequenceOrChoiceObj.any) {
          for (const anyObj of sequenceOrChoiceObj.any) {
            // namespace may be a space-delimited list; trim each token and skip XSD wildcards
            const anyNamespaces = (anyObj.attributes?.namespace ?? '')
              .split(/\s+/)
              .map((s: string) => s.trim())
              .filter((ns: string) => ns && !ns.startsWith('##'));
            for (const anyNamespace of anyNamespaces) {
              const anyTypeTC = this.getInputTypeForTypeNameInNamespace({
                typeName: complexType.attributes.name,
                typeNamespace: anyNamespace,
              });
              if ('getFields' in anyTypeTC) {
                for (const fieldName in anyTypeTC.getFields()) {
                  fieldMap[fieldName] = anyTypeTC.getField(fieldName) as any;
                }
              }
            }
          }
        }
      }
      if (complexType.complexContent) {
        for (const complexContentObj of complexType.complexContent) {
          for (const extensionObj of complexContentObj.extension) {
            const [baseTypeNamespaceAlias, baseTypeName] = extensionObj.attributes.base.split(
              ':',
            ) as [keyof XSExtensionAttributes, string];
            let baseTypeNamespace: string;
            if (extensionObj.attributes[baseTypeNamespaceAlias]) {
              baseTypeNamespace = extensionObj.attributes[baseTypeNamespaceAlias];
            } else {
              baseTypeNamespace = aliasMap.get(baseTypeNamespaceAlias);
            }
            if (!baseTypeNamespace) {
              throw new Error(`Namespace alias: ${baseTypeNamespaceAlias} is undefined!`);
            }
            const baseType = this.getNamespaceComplexTypeMap(baseTypeNamespace)?.get(baseTypeName);
            if (!baseType) {
              throw new Error(
                `Complex Type: ${baseTypeName} couldn't be found in ${baseTypeNamespace} needed for ${complexTypeName}`,
              );
            }
            const baseTypeTC = this.getInputTypeForComplexType(baseType, baseTypeNamespace);
            if ('getFields' in baseTypeTC) {
              for (const fieldName in baseTypeTC.getFields()) {
                fieldMap[fieldName] = baseTypeTC.getField(fieldName);
              }
            }
            for (const sequenceObj of extensionObj.sequence) {
              for (const elementObj of sequenceObj.element) {
                fieldMap[sanitizeNameForGraphQL(elementObj.attributes.name)] = {
                  type: () => {
                    const [typeNamespaceAlias, typeName] = elementObj.attributes.type.split(
                      ':',
                    ) as [keyof XSElementAttributes, string];
                    let typeNamespace: string;
                    if (elementObj.attributes[typeNamespaceAlias]) {
                      typeNamespace = elementObj.attributes[typeNamespaceAlias];
                    } else {
                      typeNamespace = aliasMap.get(typeNamespaceAlias);
                    }
                    if (!typeNamespace) {
                      throw new Error(`Namespace alias: ${typeNamespaceAlias} is undefined!`);
                    }
                    return this.getInputTypeForTypeNameInNamespace({ typeName, typeNamespace });
                  },
                };
              }
            }
          }
        }
      }
      if (Object.keys(fieldMap).length === 0) {
        complexTypeTC = this.schemaComposer.createScalarTC(GraphQLJSON);
      } else {
        // When two schemas share the same alias-derived prefix (e.g. both declare
        // xmlns:tns="<own namespace>"), types with the same name from different
        // namespaces collide. Detect the collision and fall back to a slug derived
        // from the namespace URI. Loop until unique in case two URIs produce the
        // same slug after normalization.
        const candidateName = `${prefix}_${complexTypeName}_Input`;
        let inputTypeName = candidateName;
        if (this.schemaComposer.has(candidateName)) {
          const nsSlug = namespaceToSlug(complexTypeNamespace);
          inputTypeName = `${nsSlug}_${complexTypeName}_Input`;
          let i = 2;
          while (this.schemaComposer.has(inputTypeName)) {
            inputTypeName = `${nsSlug}_${complexTypeName}_Input_${i++}`;
          }
        }
        complexTypeTC = this.schemaComposer.createInputTC({
          name: inputTypeName,
          fields: fieldMap,
        });
      }
      this.complexTypeInputTCMap.set(complexType, complexTypeTC);
    }
    return complexTypeTC;
  }

  getOutputFieldTypeFromElement(
    elementObj: XSElement,
    aliasMap: Map<string, string>,
    namespace: string,
    parentTypeName?: string,
  ) {
    if (elementObj.attributes?.type) {
      const [typeNamespaceAlias, typeName] = elementObj.attributes.type.split(':') as [
        keyof XSElementAttributes,
        string,
      ];
      let typeNamespace: string;
      if (elementObj.attributes[typeNamespaceAlias]) {
        typeNamespace = elementObj.attributes[typeNamespaceAlias];
      } else {
        typeNamespace = aliasMap.get(typeNamespaceAlias);
      }
      if (!typeNamespace) {
        throw new Error(`Namespace alias: ${typeNamespaceAlias} is undefined!`);
      }
      const outputTC = this.getOutputTypeForTypeNameInNamespace({ typeName, typeNamespace });
      return outputTC;
    } else if (elementObj.simpleType) {
      // eslint-disable-next-line no-unreachable-loop
      for (const simpleTypeObj of elementObj.simpleType) {
        // Dynamically defined simple type
        // So we need to define alias map for this type
        this.aliasMap.set(simpleTypeObj, aliasMap);
        // Inherit the name from elementObj, scoped to the parent type name
        // to avoid collisions when sibling types share an inline field name.
        // Skip scoping when parentTypeName already equals the namespace prefix
        // (i.e. it is a top-level-element anonymous type) to avoid double-prefixing.
        const nsPrefix = this.namespaceTypePrefixMap.get(namespace);
        const effectiveParentName =
          parentTypeName && parentTypeName !== nsPrefix ? parentTypeName : null;
        simpleTypeObj.attributes = simpleTypeObj.attributes || ({} as any);
        simpleTypeObj.attributes.name =
          simpleTypeObj.attributes.name ||
          (effectiveParentName
            ? `${effectiveParentName}_${elementObj.attributes.name}`
            : elementObj.attributes.name);
        const outputTC = this.getTypeForSimpleType(simpleTypeObj, namespace);
        return outputTC;
      }
    } else if (elementObj.complexType) {
      // eslint-disable-next-line no-unreachable-loop
      for (const complexTypeObj of elementObj.complexType) {
        // Dynamically defined type
        // So we need to define alias map for this type
        this.aliasMap.set(complexTypeObj, aliasMap);
        // Inherit the name from elementObj, scoped to the parent type name
        // to avoid collisions when sibling types share an inline field name.
        // Skip scoping when parentTypeName already equals the namespace prefix
        // (i.e. it is a top-level-element anonymous type) to avoid double-prefixing.
        const nsPrefix = this.namespaceTypePrefixMap.get(namespace);
        const effectiveParentName =
          parentTypeName && parentTypeName !== nsPrefix ? parentTypeName : null;
        complexTypeObj.attributes = complexTypeObj.attributes || ({} as any);
        complexTypeObj.attributes.name =
          complexTypeObj.attributes.name ||
          (effectiveParentName
            ? `${effectiveParentName}_${elementObj.attributes.name}`
            : elementObj.attributes.name);
        const outputTC = this.getOutputTypeForComplexType(complexTypeObj, namespace);
        return outputTC;
      }
    }
    throw new Error(`Invalid element type definition: ${elementObj.attributes.name}`);
  }

  getOutputTypeForComplexType(complexType: XSComplexType, complexTypeNamespace: string) {
    let complexTypeTC = this.complexTypeOutputTCMap.get(complexType);
    if (!complexTypeTC) {
      const complexTypeName = sanitizeNameForGraphQL(complexType.attributes.name);
      const prefix = this.namespaceTypePrefixMap.get(complexTypeNamespace);
      const aliasMap = this.aliasMap.get(complexType);
      const fieldMap: Record<string, ObjectTypeComposerFieldConfigDefinition<any, any>> = {};
      const choiceOrSequenceObjects = [
        ...(complexType.sequence || []),
        ...(complexType.choice || []),
      ];
      for (const choiceOrSequenceObj of choiceOrSequenceObjects) {
        if (choiceOrSequenceObj.element) {
          for (const elementObj of choiceOrSequenceObj.element) {
            if (elementObj.attributes?.name) {
              const fieldName = sanitizeNameForGraphQL(elementObj.attributes.name);
              const maxOccurs =
                choiceOrSequenceObj.attributes?.maxOccurs || elementObj.attributes?.maxOccurs;
              const minOccurs =
                choiceOrSequenceObj.attributes?.minOccurs || elementObj.attributes?.minOccurs;
              const nillable =
                choiceOrSequenceObj.attributes?.nillable || elementObj.attributes?.nillable;
              const isPlural = maxOccurs != null && maxOccurs !== '1';
              let isNullable = false;
              if (minOccurs == null || minOccurs === '0') {
                isNullable = true;
              }
              if (nillable === 'true') {
                isNullable = true;
              }
              if (nillable === 'false') {
                isNullable = false;
              }
              fieldMap[fieldName] = {
                type: () => {
                  let outputTC: AnyTypeComposer<any> = this.getOutputFieldTypeFromElement(
                    elementObj,
                    aliasMap,
                    complexTypeNamespace,
                    complexTypeName,
                  );
                  if (isPlural) {
                    outputTC = outputTC.getTypePlural();
                  }
                  if (!isNullable) {
                    outputTC = outputTC.getTypeNonNull();
                  }
                  return outputTC;
                },
              } as any;
            } else {
              if (elementObj.attributes?.ref) {
                this.logger.warn(`element.ref isn't supported yet.`, elementObj.attributes?.ref);
              } else {
                this.logger.warn(`Element doesn't have a name in ${complexTypeName}. Ignoring...`);
              }
            }
          }
        }
        if (choiceOrSequenceObj.any) {
          for (const anyObj of choiceOrSequenceObj.any) {
            // namespace may be a space-delimited list; trim each token and skip XSD wildcards
            const anyNamespaces = (anyObj.attributes?.namespace ?? '')
              .split(/\s+/)
              .map((s: string) => s.trim())
              .filter((ns: string) => ns && !ns.startsWith('##'));
            for (const anyNamespace of anyNamespaces) {
              const anyTypeTC = this.getOutputTypeForTypeNameInNamespace({
                typeName: complexType.attributes.name,
                typeNamespace: anyNamespace,
              });
              if ('getFields' in anyTypeTC) {
                for (const fieldName in anyTypeTC.getFields()) {
                  fieldMap[fieldName] = anyTypeTC.getField(fieldName) as any;
                }
              }
            }
          }
        }
      }
      if (complexType.complexContent) {
        for (const complexContentObj of complexType.complexContent) {
          for (const extensionObj of complexContentObj.extension) {
            const [baseTypeNamespaceAlias, baseTypeName] = extensionObj.attributes.base.split(
              ':',
            ) as [keyof XSExtensionAttributes, string];
            const baseTypeNamespace =
              aliasMap.get(baseTypeNamespaceAlias) ||
              extensionObj.attributes[baseTypeNamespaceAlias];
            if (!baseTypeNamespace) {
              throw new Error(`Namespace alias: ${baseTypeNamespaceAlias} is undefined!`);
            }
            const baseType = this.getNamespaceComplexTypeMap(baseTypeNamespace)?.get(baseTypeName);
            if (!baseType) {
              throw new Error(
                `Complex Type: ${baseTypeName} couldn't be found in ${baseTypeNamespace} needed for ${complexTypeName}`,
              );
            }
            const baseTypeTC = this.getOutputTypeForComplexType(baseType, baseTypeNamespace);
            if ('getFields' in baseTypeTC) {
              for (const fieldName in baseTypeTC.getFields()) {
                fieldMap[fieldName] = baseTypeTC.getField(fieldName);
              }
            }
            const choiceOrSequenceObjects = [
              ...(extensionObj.sequence || []),
              ...(extensionObj.choice || []),
            ];
            for (const choiceOrSequenceObj of choiceOrSequenceObjects) {
              for (const elementObj of choiceOrSequenceObj.element) {
                if (!elementObj.attributes?.name) continue;
                const fieldName = sanitizeNameForGraphQL(elementObj.attributes.name);
                const maxOccurs =
                  choiceOrSequenceObj.attributes?.maxOccurs || elementObj.attributes?.maxOccurs;
                const minOccurs =
                  choiceOrSequenceObj.attributes?.minOccurs || elementObj.attributes?.minOccurs;
                const nillable =
                  choiceOrSequenceObj.attributes?.nillable || elementObj.attributes?.nillable;
                const isPlural = maxOccurs != null && maxOccurs !== '1';
                let isNullable = false;
                if (minOccurs == null || minOccurs === '0') {
                  isNullable = true;
                }
                if (nillable === 'true') {
                  isNullable = true;
                }
                if (nillable === 'false') {
                  isNullable = false;
                }
                fieldMap[fieldName] = {
                  type: () => {
                    let outputTC: AnyTypeComposer<any> = this.getOutputFieldTypeFromElement(
                      elementObj,
                      aliasMap,
                      complexTypeNamespace,
                      complexTypeName,
                    );
                    if (isPlural) {
                      outputTC = outputTC.getTypePlural();
                    }
                    if (!isNullable) {
                      outputTC = outputTC.getTypeNonNull();
                    }
                    return outputTC;
                  },
                } as any;
              }
            }
          }
        }
      }
      if (Object.keys(fieldMap).length === 0) {
        complexTypeTC = this.schemaComposer.createScalarTC(GraphQLJSON);
      } else {
        // When two schemas share the same alias-derived prefix (e.g. both declare
        // xmlns:tns="<own namespace>"), types with the same name from different
        // namespaces collide. Detect the collision and fall back to a slug derived
        // from the namespace URI. Loop until unique in case two URIs produce the
        // same slug after normalization.
        const candidateName = `${prefix}_${complexTypeName}`;
        let outputTypeName = candidateName;
        if (this.schemaComposer.has(candidateName)) {
          const nsSlug = namespaceToSlug(complexTypeNamespace);
          outputTypeName = `${nsSlug}_${complexTypeName}`;
          let i = 2;
          while (this.schemaComposer.has(outputTypeName)) {
            outputTypeName = `${nsSlug}_${complexTypeName}_${i++}`;
          }
        }
        complexTypeTC = this.schemaComposer.createObjectTC({
          name: outputTypeName,
          fields: fieldMap,
        });
      }
      this.complexTypeOutputTCMap.set(complexType, complexTypeTC);
    }
    return complexTypeTC;
  }

  getOutputTypeForTypeNameInNamespace({
    typeName,
    typeNamespace,
  }: {
    typeName: string;
    typeNamespace: string;
  }) {
    // Check element aliases first — consistent with the eager path that overwrites the type map
    const elementRef = this.namespaceElementRefMap.get(typeNamespace)?.get(typeName);
    if (elementRef) {
      return this.getOutputTypeForTypeNameInNamespace(elementRef);
    }
    const complexType = this.getNamespaceComplexTypeMap(typeNamespace)?.get(typeName);
    if (complexType) {
      return this.getOutputTypeForComplexType(complexType, typeNamespace);
    }
    const simpleType = this.getNamespaceSimpleTypeMap(typeNamespace)?.get(typeName);
    if (simpleType) {
      return this.getTypeForSimpleType(simpleType, typeNamespace);
    }
    throw new Error(`Type: ${typeName} couldn't be found in ${typeNamespace}`);
  }

  getOutputTypeForMessage(message: WSDLMessage) {
    let outputTCAndName = this.messageOutputTCMap.get(message);
    if (!outputTCAndName) {
      const aliasMap = this.aliasMap.get(message);
      const partObj = message.part[0];

      if (partObj.attributes.element) {
        const [elementNamespaceAlias, elementName] = partObj.attributes.element.split(':') as [
          keyof WSDLPartAttributes,
          string,
        ];
        outputTCAndName = {
          type: () => {
            const elementTypeNamespace =
              aliasMap.get(elementNamespaceAlias) || partObj.attributes[elementNamespaceAlias];
            if (!elementTypeNamespace) {
              throw new Error(`Namespace alias: ${elementNamespaceAlias} is undefined!`);
            }
            return this.getOutputTypeForTypeNameInNamespace({
              typeName: elementName,
              typeNamespace: elementTypeNamespace,
            });
          },
          elementName,
        };
      } else if (partObj.attributes.type) {
        const elementName = partObj.attributes.name;
        outputTCAndName = {
          type: () => {
            const [typeNamespaceAlias, typeName] = partObj.attributes.type.split(':');
            const typeNamespace = aliasMap.get(typeNamespaceAlias);
            if (!typeNamespace) {
              throw new Error(`Namespace alias: ${typeNamespaceAlias} is undefined!`);
            }
            return this.getOutputTypeForTypeNameInNamespace({ typeName, typeNamespace });
          },
          elementName,
        };
      }
      this.messageOutputTCMap.set(message, outputTCAndName);
    }
    return outputTCAndName;
  }

  buildSchema() {
    if (this.schemaComposer.Query.getFieldNames().length === 0) {
      this.schemaComposer.Query.addFields({
        placeholder: {
          type: GraphQLVoid,
        },
      });
    }
    const schema = this.schemaComposer.buildSchema();
    const schemaExts: any = (schema.extensions ||= {});
    schemaExts.directives ||= {};
    schemaExts.directives.transport = {
      kind: 'soap',
      subgraph: this.subgraphName,
    };
    return schema;
  }
}
