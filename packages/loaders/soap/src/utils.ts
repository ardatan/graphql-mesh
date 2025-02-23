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
