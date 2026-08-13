import { resolvers as scalarsResolversMap } from 'graphql-scalars';

export const specifiedScalarNames = new Set(['Int', 'Float', 'String', 'Boolean', 'ID']);

export const ignoreList = [
  ...specifiedScalarNames,
  'date',
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
  'ObjMap',
  'HttpMethod',
  ...Object.keys(scalarsResolversMap),
];
