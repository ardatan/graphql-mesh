/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-useless-escape */
import { SoapType, SoapOperationArg, SoapObjectType, SoapField } from '../soap2graphql/soap-endpoint';
import { NodeSoapOperation } from './node-soap-endpoint';
import { NodeSoapWsdl } from './node-soap';
import { Logger } from '@graphql-mesh/types';

// an content object ... basically a plain JS object
type WsdlContent = { [key: string]: any };
// a type definition in the WSDL;
// Content: a complete definition of the type (fields etc.)
// string: a primitive type (e.g. "xs:string")
// null: ...probably a faulty WSDL
type WsdlTypeContent = WsdlContent | string | null;

// input content of an operation, defines the args of the operation
type WsdlInputContent = { [argName: string]: WsdlArgContent } | {} | null;
type WsdlArgContent = WsdlTypeContent;

// output content of an operation, defines the result type
type WsdlOutputContent = { resultFieldName: WsdlResultContent } | {} | null;
type WsdlResultContent = WsdlTypeContent;

type XsdTypeDefinition = { name: 'complexType'; $name: string; children: XsdTypeDefinitionBody[] };

type XsdTypeDefinitionBody = XsdSequence | XsdComplexType;

type XsdSequence = { name: 'sequence'; children: XsdFieldDefinition[] };

type XsdComplexType = { name: 'complexContent'; children: XsdExtension[] };
type XsdExtension = { name: 'extension'; $base: string; children: XsdSequence[] };

type XsdFieldDefinition = {
  $name: string;
  $targetNamespace: string;
  $type: string;
  $maxOccurs?: 'unbounded' | string;
};

export class NodeSoapWsdlResolver {
  private alreadyResolved: Map<string, SoapType> = new Map();

  constructor(private wsdl: NodeSoapWsdl, private logger: Logger) {}

  warn(...args: any[]): void {
    this.logger.warn(...args);
  }

  debug(...args: any[]): void {
    this.logger.debug(...args);
  }

  createOperationArgs(operation: NodeSoapOperation): SoapOperationArg[] {
    const inputContent: WsdlInputContent = operation.content().input;

    this.debug(`creating args for operation '${operation.name()}' from content`, inputContent);

    if (!inputContent) {
      this.warn(`no input definition for operation '${operation.name()}'`);
    }

    // inputContent===null -> argNames===[]
    const argNames: string[] = nonNamespaceKeys(inputContent);
    const inputNamespace = inputContent && targetNamespace(inputContent);

    const args: SoapOperationArg[] = argNames
      .map((key: string) => {
        return this.createOperationArg(operation, inputNamespace, key, inputContent[key]);
      })
      .filter(arg => !!arg);

    return args;
  }

  private createOperationArg(
    operation: NodeSoapOperation,
    inputNamespace: string,
    argWsdlFieldName: string,
    argContent: WsdlArgContent
  ): SoapOperationArg {
    this.debug(`creating arg for operation '${operation.name()}' from content `, argContent);

    const parsedArgName: { name: string; isList: boolean } = parseWsdlFieldName(argWsdlFieldName);

    const inputType: SoapType = this.resolveContentToSoapType(
      inputNamespace,
      argContent,
      `arg '${argWsdlFieldName}' of operation '${operation.name()}'`
    );

    const input: SoapOperationArg = {
      name: parsedArgName.name,
      type: inputType,
      isList: parsedArgName.isList,
    };
    return input;
  }

  createOperationOutput(operation: NodeSoapOperation): {
    type: { type: SoapType; isList: boolean };
    resultField: string;
  } {
    const outputContent: WsdlOutputContent = operation.content().output;

    this.debug(`creating output for operation '${operation.name()}' from content `, outputContent);

    // determine type and field name
    let resultType: SoapType;
    let resultFieldName: string;
    const outputNamespace = targetNamespace(outputContent);
    const ownerStringForLog = `output of operation '${operation.name()}'`;
    if (!outputContent) {
      this.warn(`no definition for output type of operation '${operation.name()}', using 'string'`);
      resultType = this.resolveContentToSoapType(outputNamespace, 'string', ownerStringForLog);
    } else {
      const outputContentKeys: string[] = nonNamespaceKeys(outputContent);

      if (outputContentKeys.length <= 0) {
        // content has no sub content
        // void operation; use String as result type. when executed, it will return null
        resultFieldName = null;
        resultType = this.resolveContentToSoapType(outputNamespace, 'string', ownerStringForLog);
      } else {
        if (outputContentKeys.length > 1) {
          // content has multiple fields, use the first one
          // @todo maybe better build an extra type for this case, but how to name it?
          this.warn(`multiple result fields in output definition of operation '${operation.name()}', using first one`);
        }

        resultFieldName = outputContentKeys[0];
        const resultContent: WsdlResultContent = outputContent[resultFieldName];

        if (!resultContent) {
          this.warn(
            `no type definition for result field '${resultFieldName}' in output definition for operation '${operation.name()}', using 'string'`
          );
          resultType = this.resolveContentToSoapType(outputNamespace, 'string', ownerStringForLog);
        } else {
          resultType = this.resolveContentToSoapType(outputNamespace, resultContent, ownerStringForLog);
        }
      }
    }

    const parsedResultFieldName = parseWsdlFieldName(resultFieldName);

    return {
      type: {
        type: resultType,
        isList: parsedResultFieldName.isList,
      },
      resultField: parsedResultFieldName.name,
    };
  }

  private resolveContentToSoapType(
    parentNamespace: string,
    typeContent: WsdlTypeContent,
    ownerStringForLog: string
  ): SoapType {
    this.debug(`resolving soap type for ${ownerStringForLog} from content `, typeContent);

    // determine name of the type
    let wsdlTypeName;
    let namespace;
    if (!typeContent) {
      this.warn(`no type definition for ${ownerStringForLog}, using 'string'`);
      wsdlTypeName = 'string';
      namespace = parentNamespace;
    } else if (typeof typeContent === 'string') {
      // primitive type
      wsdlTypeName = withoutNamespace(typeContent);
      namespace = parentNamespace;
    } else {
      wsdlTypeName = this.findTypeName(typeContent);
      if (!wsdlTypeName) {
        this.warn(`no type name found for ${ownerStringForLog}, using 'string'`);
        wsdlTypeName = 'string';
      }
      namespace = targetNamespace(typeContent);
    }

    return this.resolveWsdlNameToSoapType(namespace, wsdlTypeName, ownerStringForLog);
  }

  private findTypeName(content: WsdlTypeContent): string {
    const types = this.wsdl.definitions.descriptions.types;
    for (const key in types) {
      if (types[key] === content) {
        return key;
      }
    }
    return null;
  }

  resolveWsdlNameToSoapType(namespace: string, wsdlTypeName: string, ownerStringForLog: string): SoapType {
    this.debug(
      () => `resolving soap type for ${ownerStringForLog} from namespace '${namespace}', type name '${wsdlTypeName}'`
    );

    // lookup cache; this accomplishes three things:
    // 1) an incredible boost in performance, must be at least 3ns, !!hax0r!!11
    // 2) every type definition (primitive and complex) has only one instance of SoapType
    // 3) resolve circular dependencies between types
    if (this.alreadyResolved.has(namespace + wsdlTypeName)) {
      this.debug(`resolved soap type for namespace: '${namespace}', typeName: '${wsdlTypeName}' from cache`);
      return this.alreadyResolved.get(namespace + wsdlTypeName);
    }

    // get the defition of the type from the schema section in the WSDL
    const xsdTypeDefinition: XsdTypeDefinition = this.findXsdTypeDefinition(namespace, wsdlTypeName);

    if (!xsdTypeDefinition?.children?.length) {
      // has no type definition
      // --> primitive type, e.g. 'string'
      const soapType: string = wsdlTypeName;
      this.alreadyResolved.set(namespace + wsdlTypeName, soapType);

      this.debug(
        () => `resolved namespace: '${namespace}', typeName: '${wsdlTypeName}' to primitive type '${soapType}'`
      );

      return soapType;
    } else {
      // create a new object type
      const soapType: SoapObjectType = {
        name: xsdTypeDefinition.$name,
        base: null,
        fields: null,
      };
      this.alreadyResolved.set(namespace + wsdlTypeName, soapType);

      // resolve bindings (field types, base type) after type has been registered to resolve circular dependencies
      this.resolveTypeBody(soapType, namespace, xsdTypeDefinition);

      this.debug(`resolved namespace: '${namespace}', typeName: '${wsdlTypeName}' to object type `, soapType);

      return soapType;
    }
  }

  private findXsdTypeDefinition(namespace: string, typeName: string): XsdTypeDefinition {
    return this.wsdl.findSchemaObject(namespace, typeName);
  }

  private resolveTypeBody(soapType: SoapObjectType, namespace: string, typeDefinition: XsdTypeDefinition): void {
    this.debug(`resolving body of soap type '${soapType.name}' from namespace '${namespace}', definition`, typeDefinition);

    const typeName: string = typeDefinition.$name;

    let fields: XsdFieldDefinition[] = null;
    let baseTypeName: string = null;

    const body: XsdTypeDefinitionBody = typeDefinition.children[0];

    if (body.name === 'sequence') {
      const sequence: XsdSequence = body;
      fields = sequence.children || [];
    } else if (body.name === 'complexContent') {
      const extension: XsdExtension = body.children[0];
      const sequence: XsdSequence = extension.children[0];
      baseTypeName = withoutNamespace(extension.$base);
      fields = sequence.children || [];
    } else {
      this.warn(`cannot parse fields for soap type '${typeName}', leaving fields empty`);
      fields = [];
    }

    const soapFields: SoapField[] = fields
      .filter(field => field.$name)
      .map((field: XsdFieldDefinition) => {
        return {
          name: field.$name,
          type: this.resolveWsdlNameToSoapType(
            field.$targetNamespace,
            withoutNamespace(field.$type),
            `field '${field.$name}' of soap type '${soapType.name}'`
          ),
          isList: !!field.$maxOccurs && field.$maxOccurs === 'unbounded',
        };
      });

    // @todo in XSD it is possible to inherit a type from a primitive ... may have to handle this
    const baseType: SoapObjectType = !baseTypeName
      ? null
      : <SoapObjectType>(
          this.resolveWsdlNameToSoapType(namespace, baseTypeName, `base type of soap type '${soapType.name}'`)
        );

    soapType.fields = soapFields;
    soapType.base = baseType;
  }
}

function nonNamespaceKeys(obj: any): string[] {
  return !obj ? [] : (Object.keys(obj).filter(key => !isNamespaceKey(key.toString())) as string[]);
}

function targetNamespace(content: any) {
  return content.targetNamespace;
}

function isNamespaceKey(key: string): boolean {
  return key === 'targetNSAlias' || key === 'targetNamespace';
}

function withoutNamespace(value: string): string {
  if (!value) {
    return value;
  }
  const matcher: RegExpMatchArray = value.match(/[a-zA-Z0-9]+\:(.+)/);
  return !matcher || matcher.length < 2 ? value : matcher[1];
}

function isWsdlListFieldName(wsdlFieldName: string): boolean {
  return !!wsdlFieldName && wsdlFieldName.endsWith('[]');
}

function parseWsdlFieldName(wsdlFieldName: string): { name: string; isList: boolean } {
  if (isWsdlListFieldName(wsdlFieldName)) {
    return {
      name: wsdlFieldName.substring(0, wsdlFieldName.length - 2),
      isList: true,
    };
  } else {
    return {
      name: wsdlFieldName,
      isList: false,
    };
  }
}
