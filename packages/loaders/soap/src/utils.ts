import { X2jOptions } from 'fast-xml-parser';

export interface SoapAnnotations {
  elementName: string;
  bindingNamespace: string;
  endpoint: string;
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
