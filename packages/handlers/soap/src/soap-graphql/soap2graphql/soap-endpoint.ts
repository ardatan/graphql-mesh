/**
 * SOAP endpoint defined by a WSDL.
 */
export interface SoapEndpoint {
  services(): SoapService[];

  /**
   * Returns a textual, human readable description of the soap endpoint.
   * Note: ATM this is only used to have at least one query field in the GraphQLSchema.
   */
  description(): string;
}

export interface SoapService {
  endpoint(): SoapEndpoint;
  name(): string;
  ports(): SoapPort[];
}

export interface SoapPort {
  endpoint(): SoapEndpoint;
  service(): SoapService;
  name(): string;
  operations(): SoapOperation[];
}

export interface SoapOperation {
  endpoint(): SoapEndpoint;
  service(): SoapService;
  port(): SoapPort;
  name(): string;
  /**
   * Arguments that this operation accepts.
   */
  args(): SoapOperationArg[];
  /**
   * Output that this operation provides if called.
   */
  output(): { type: SoapType; isList: boolean };
  /**
   * The field in the SOAP output message that contains the actual output.
   */
  resultField(): string;
}

/**
 * A type declared in the WSDL.
 */
export type SoapType = SoapObjectType | SoapPrimitiveType;

/**
 * A primitive type in the WSDL - only defined by its name.
 */
export type SoapPrimitiveType = string;

/**
 * An object type in the WSDL.
 * Defined by its name, fields and maybe a base type.
 */
export interface SoapObjectType {
  name: string;
  base: SoapObjectType;
  fields: SoapField[];
}

export interface SoapField {
  name: string;
  type: SoapType;
  isList: boolean;
}

export type SoapOperationArg = SoapField;
