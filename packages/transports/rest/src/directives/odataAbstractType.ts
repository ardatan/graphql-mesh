import { isEnumType, type GraphQLTypeResolver } from 'graphql';
import { pascalCase } from 'pascal-case';

/**
 * OData abstract-type resolveType: map `@odata.type` → GraphQL type name.
 * Wired from `processDirectives` when a type carries `@abstractType`.
 */

const SCALARS = new Map<string, string>([
  ['Edm.Binary', 'String'],
  ['Edm.Stream', 'String'],
  ['Edm.String', 'String'],
  ['Edm.Int16', 'Int'],
  ['Edm.Byte', 'Byte'],
  ['Edm.Int32', 'Int'],
  ['Edm.Int64', 'BigInt'],
  ['Edm.Double', 'Float'],
  ['Edm.Boolean', 'Boolean'],
  ['Edm.Guid', 'GUID'],
  ['Edm.DateTimeOffset', 'DateTime'],
  ['Edm.Date', 'Date'],
  ['Edm.TimeOfDay', 'String'],
  ['Edm.Single', 'Float'],
  ['Edm.Duration', 'ISO8601Duration'],
  ['Edm.Decimal', 'Float'],
  ['Edm.SByte', 'Byte'],
  ['Edm.GeographyPoint', 'String'],
]);

function getNamespaceFromTypeRef(typeRef: string, namespaces: Set<string>) {
  let namespace = '';
  namespaces?.forEach(el => {
    if (
      typeRef.startsWith(el) &&
      el.length > namespace.length &&
      !typeRef.replace(el + '.', '').includes('.')
    ) {
      namespace = el;
    }
  });
  return namespace;
}

function getTypeNameFromRef(opts: {
  typeRef: string;
  isInput: boolean;
  isRequired: boolean;
  aliasNamespaceMap: Map<string, string>;
  multipleSchemas: boolean;
  namespaces: Set<string>;
  isEnumType(typeName: string): boolean;
}) {
  const typeRefArr = opts.typeRef.split('Collection(');
  const arrayDepth = typeRefArr.length;
  let actualTypeRef = typeRefArr.join('').split(')').join('');
  const typeNamespace = getNamespaceFromTypeRef(actualTypeRef, opts.namespaces);
  if (opts.aliasNamespaceMap.has(typeNamespace)) {
    const alias = opts.aliasNamespaceMap.get(typeNamespace);
    actualTypeRef = actualTypeRef.replace(typeNamespace, alias!);
  }
  const actualTypeRefArr = actualTypeRef.split('.');
  const typeName = opts.multipleSchemas
    ? pascalCase(actualTypeRefArr.join('_'))
    : actualTypeRefArr[actualTypeRefArr.length - 1];
  let realTypeName = typeName;
  if (SCALARS.has(actualTypeRef)) {
    realTypeName = SCALARS.get(actualTypeRef)!;
  } else if (opts.isEnumType(typeName)) {
    realTypeName = typeName;
  } else if (opts.isInput) {
    realTypeName += 'Input';
  }
  const fakeEmptyArr = new Array(arrayDepth);
  realTypeName = fakeEmptyArr.join('[') + realTypeName + fakeEmptyArr.join(']');
  if (opts.isRequired) {
    realTypeName += '!';
  }
  return realTypeName;
}

export function createODataAbstractTypeResolver(opts: {
  entityTypeName: string;
  isAbstract: boolean;
  aliasNamespaceMap: Map<string, string>;
  multipleSchemas: boolean;
  namespaces: Set<string>;
}): GraphQLTypeResolver<any, any> {
  return function abstractTypeResolver(root, _context, info) {
    const typeRef = root?.['@odata.type']?.replace('#', '');
    if (typeRef) {
      return getTypeNameFromRef({
        typeRef,
        isInput: false,
        isRequired: false,
        aliasNamespaceMap: opts.aliasNamespaceMap,
        multipleSchemas: opts.multipleSchemas,
        namespaces: opts.namespaces,
        isEnumType(typeName: string) {
          const type = info.schema.getType(typeName);
          return isEnumType(type);
        },
      });
    }
    return opts.isAbstract ? `T${opts.entityTypeName}` : opts.entityTypeName;
  };
}
