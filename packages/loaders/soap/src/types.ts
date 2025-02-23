export interface WSDLDefinitionAttributes {
  name: string;
  targetNamespace: string;
  soap12?: string;
}

export interface WSDLDefinition {
  attributes: WSDLDefinitionAttributes;
  import?: WSDLImport[];
  service?: WSDLService[];
  binding?: WSDLBinding[];
  types?: WSDLTypes[];
  message?: WSDLMessage[];
  portType?: WSDLPortType[];
}

export interface WSDLPortTypeAttributes {
  name: string;
}

export interface WSDLPortType {
  attributes: WSDLPortTypeAttributes;
  operation: WSDLOperation[];
}

export interface WSDLMessageAttributes {
  name: string;
}

export interface WSDLPartAttributes {
  element: string;
  type: string;
  name: string;
}

export interface WSDLPart {
  attributes: WSDLPartAttributes;
}

export interface WSDLMessage {
  attributes: WSDLMessageAttributes;
  part: WSDLPart[];
}

export interface XSSchemaAttributes {
  id: string;
  targetNamespace: string;
  version: string;
}

export interface XSSchema {
  attributes: XSSchemaAttributes;
  element?: XSElement[];
  complexType?: XSComplexType[];
  simpleType?: XSSimpleType[];
  import?: XSImport[];
}

export interface XSImport {
  attributes: XSImportAttributes;
}

export interface XSImportAttributes {
  namespace: string;
  schemaLocation: string;
}

export interface XSSimpleTypeAttributes {
  name: string;
}

export interface XSSimpleType {
  attributes: XSSimpleTypeAttributes;
  restriction: XSRestriction[];
}

export interface XSRestrictionAttributes {
  base: string;
}

export interface XSRestriction {
  pattern: XSPattern[];
  attributes: XSRestrictionAttributes;
  enumeration: XSEnumeration[];
}

export interface XSPattern {
  attributes: XSPatternAttributes;
}

export interface XSPatternAttributes {
  value: string;
}

export interface XSEnumerationAttributes {
  value: string;
}

export interface XSEnumeration {
  attributes: XSEnumerationAttributes;
}

export interface XSComplexTypeAttributes {
  name: string;
}

export interface XSElementAttributes {
  name: string;
  type: string;
  maxOccurs?: string;
  minOccurs?: string;
  nillable?: 'true' | 'false';
  ref?: string;
}

export interface XSElement {
  attributes: XSElementAttributes;
  complexType?: XSComplexType[];
  simpleType?: XSSimpleType[];
}

export interface XSSequenceAttributes {
  maxOccurs?: string;
  minOccurs?: string;
  nillable?: 'true' | 'false';
}

export interface XSSequence {
  attributes?: XSSequenceAttributes;
  element?: XSElement[];
  any?: XSAny[];
}

export interface XSChoiceAttributes {
  maxOccurs?: string;
  minOccurs?: string;
  nillable?: 'true' | 'false';
}

export interface XSChoice {
  attributes?: XSChoiceAttributes;
  element?: XSElement[];
  any?: XSAny[];
}

export interface XSAny {
  attributes?: XSAnyAttributes;
}

export interface XSAnyAttributes {
  namespace?: string;
}

export interface XSExtensionAttributes {
  base: string;
}

export interface XSExtension {
  attributes: XSExtensionAttributes;
  complexContent?: XSComplexContent[];
  sequence?: XSSequence[];
  choice?: XSChoice[];
}

export interface XSComplexContent {
  extension: XSExtension[];
}

export interface XSComplexType {
  attributes?: XSComplexTypeAttributes;
  complexContent?: XSComplexContent[];
  sequence?: XSSequence[];
  choice?: XSChoice[];
}

export interface WSDLTypes {
  schema: XSSchema[];
}

export interface WSDLBindingAttributes {
  name: string;
  type: string;
}

export interface SOAPBindingAttributes {
  style: string;
  transport: string;
}

export interface SOAPBinding {
  attributes: SOAPBindingAttributes;
}

export interface WSDLBinding {
  attributes: WSDLBindingAttributes;
  binding: SOAPBinding;
  operation: WSDLOperation[];
}

export interface WSDLOperationAttributes {
  name: string;
}

export interface SOAPOperationAttributes {
  soapAction: string;
  style: string;
}

export interface SOAPOperation {
  attributes: SOAPOperationAttributes;
}

export interface WSDLInputAttributes {
  name: string;
  message: string;
}

export interface SOAPBodyAttributes {
  use: string;
}

export interface SOAPBody {
  attributes: SOAPBodyAttributes;
}

export interface WSDLInput {
  attributes: WSDLInputAttributes;
  body: SOAPBody[];
}

export interface WSDLOutputAttributes {
  name: string;
  message: string;
}

export interface WSDLOutput {
  attributes: WSDLOutputAttributes;
  body: SOAPBody[];
}

export interface WSDLFaultAttributes {
  name: string;
}

export interface SOAPFault {
  attributes: SOAPFaultAttributes;
}

export interface SOAPFaultAttributes {
  name: string;
  use: string;
}

export interface WSDLFault {
  attributes: WSDLFaultAttributes;
  fault: SOAPFault[];
}

export interface WSDLOperation {
  attributes: WSDLOperationAttributes;
  operation?: SOAPOperation[];
  input: WSDLInput[];
  output: WSDLOutput[];
  fault: WSDLFault[];
}

export interface WSDLServiceAttributes {
  name: string;
}

export interface WSDLService {
  attributes: WSDLServiceAttributes;
  port: WSDLPort[];
}

export interface WSDLPortAttributes {
  binding: string;
  name: string;
}

export interface WSDLPort {
  attributes: WSDLPortAttributes;
  address: WSDLAddress[];
}

export interface WSDLAddressAttributes {
  location: string;
}

export interface WSDLAddress {
  attributes: WSDLAddressAttributes;
}

export interface WSDLImportAttributes {
  location?: string;
  namespace: string;
}

export interface WSDLImport {
  attributes: WSDLImportAttributes;
}

export interface WSDLObject {
  definitions: WSDLDefinition[];
}

export interface XSDObject {
  schema: XSSchema[];
}
