import { pascalCase } from 'pascal-case';

interface GetNamespaceFromTypeRefOpts {
  namespaces: Set<string>;
  typeRef: string;
}

function getNamespaceFromTypeRef({ typeRef, namespaces }: GetNamespaceFromTypeRefOpts) {
  let namespace = '';
  namespaces?.forEach(el => {
    if (
      typeRef.startsWith(el) &&
      el.length > namespace.length && // It can be deeper namespace
      !typeRef.replace(el + '.', '').includes('.') // Typename cannot have `.`
    ) {
      namespace = el;
    }
  });
  return namespace;
}

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

export function getTypeNameFromRef({
  typeRef,
  isInput,
  isRequired,
  aliasNamespaceMap,
  multipleSchemas,
  namespaces,
  isEnumType,
}: {
  typeRef: string;
  isInput: boolean;
  isRequired: boolean;
  aliasNamespaceMap: Map<string, string>;
  multipleSchemas: boolean;
  namespaces: Set<string>;
  isEnumType(typeName: string): boolean;
}) {
  const typeRefArr = typeRef.split('Collection(');
  const arrayDepth = typeRefArr.length;
  let actualTypeRef = typeRefArr.join('').split(')').join('');
  const typeNamespace = getNamespaceFromTypeRef({
    typeRef: actualTypeRef,
    namespaces,
  });
  if (aliasNamespaceMap.has(typeNamespace)) {
    const alias = aliasNamespaceMap.get(typeNamespace);
    actualTypeRef = actualTypeRef.replace(typeNamespace, alias);
  }
  const actualTypeRefArr = actualTypeRef.split('.');
  const typeName = multipleSchemas
    ? pascalCase(actualTypeRefArr.join('_'))
    : actualTypeRefArr[actualTypeRefArr.length - 1];
  let realTypeName = typeName;
  if (SCALARS.has(actualTypeRef)) {
    realTypeName = SCALARS.get(actualTypeRef);
  } else if (isEnumType(typeName)) {
    realTypeName = typeName;
  } else if (isInput) {
    realTypeName += 'Input';
  }
  const fakeEmptyArr = new Array(arrayDepth);
  realTypeName = fakeEmptyArr.join('[') + realTypeName + fakeEmptyArr.join(']');
  if (isRequired) {
    realTypeName += '!';
  }
  return realTypeName;
}
