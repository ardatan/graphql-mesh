import type { X2jOptions } from 'fast-xml-parser';

export const parseXmlOptions: Partial<X2jOptions> = {
  attributeNamePrefix: '',
  attributesGroupName: 'attributes',
  textNodeName: 'innerText',
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (_, __, ___, isAttribute) => !isAttribute,
  allowBooleanAttributes: true,
};
