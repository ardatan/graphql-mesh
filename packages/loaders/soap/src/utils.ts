import type { X2jOptions } from 'fast-xml-parser';

export interface SoapAnnotations {
  subgraph: string;
  elementName: string;
  bindingNamespace: string;
  endpoint: string;
  soapNamespace: string;
  bodyAlias?: string;
  soapAction?: string;
  soapHeaders?: {
    alias?: string;
    namespace: string;
    headers: unknown;
  };
  /** Names of GraphQL args that map to soap:Header parts (detected from WSDL binding). */
  headerArgNames?: string[];
  /** JSON-serialised map of GraphQL arg name → XSD namespace URI for each message part. */
  argNamespacesJson?: string;
}

export const PARSE_XML_OPTIONS: Partial<X2jOptions> = {
  attributeNamePrefix: '',
  attributesGroupName: 'attributes',
  textNodeName: 'innerText',
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (_, __, ___, isAttribute) => !isAttribute,
  allowBooleanAttributes: true,
};
