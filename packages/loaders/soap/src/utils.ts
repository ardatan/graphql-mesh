import { X2jOptions } from 'fast-xml-parser';

export interface SoapAnnotations {
  elementName: string;
  bindingNamespace: string;
  endpoint: string;
}

export const PARSE_XML_OPTIONS: Partial<X2jOptions> = {
  attributeNamePrefix: '',
  attrNodeName: 'attributes',
  textNodeName: 'innerText',
  ignoreAttributes: false,
  ignoreNameSpace: true,
  arrayMode: true,
  allowBooleanAttributes: true,
};
