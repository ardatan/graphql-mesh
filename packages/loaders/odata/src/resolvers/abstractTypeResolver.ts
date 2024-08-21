import { isEnumType, type GraphQLTypeResolver } from 'graphql';
import { getTypeNameFromRef } from '../utils/getTypeNameFromRef.js';

interface AbstractTypeResolverOpts {
  entityTypeName: string;
  isAbstract: boolean;
  aliasNamespaceMap: Map<string, string>;
  multipleSchemas: boolean;
  namespaces: Set<string>;
}

export function createAbstractTypeResolver({
  entityTypeName,
  isAbstract,
  aliasNamespaceMap,
  multipleSchemas,
  namespaces,
}: AbstractTypeResolverOpts): GraphQLTypeResolver<any, any> {
  return function abstractTypeResolver(root, context, info) {
    const typeRef = root['@odata.type']?.replace('#', '');
    if (typeRef) {
      const typeName = getTypeNameFromRef({
        typeRef: root['@odata.type'].replace('#', ''),
        isInput: false,
        isRequired: false,
        aliasNamespaceMap,
        multipleSchemas,
        namespaces,
        isEnumType(typeName: string) {
          const type = info.schema.getType(typeName);
          return isEnumType(type);
        },
      });
      return typeName;
    }
    return isAbstract ? `T${entityTypeName}` : entityTypeName;
  };
}
