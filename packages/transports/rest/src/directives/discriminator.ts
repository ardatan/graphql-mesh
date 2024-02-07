import { GraphQLInterfaceType } from 'graphql';

export function processDiscriminatorAnnotations({
  interfaceType,
  discriminatorFieldName,
}: {
  interfaceType: GraphQLInterfaceType;
  discriminatorFieldName: string;
}) {
  interfaceType.resolveType = function discriminatorDirectiveHandler(root) {
    return root[discriminatorFieldName];
  };
}
