import { resolvers as scalarsResolversMap } from 'graphql-scalars';

export const ignoreList = [
  'Int',
  'Float',
  'String',
  'Boolean',
  'ID',
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
