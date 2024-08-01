import type { GraphQLInterfaceType } from 'graphql';

export function processDiscriminatorAnnotations({
  interfaceType,
  discriminatorField,
  discriminatorMapping,
}: {
  interfaceType: GraphQLInterfaceType;
  discriminatorField: string;
  discriminatorMapping: [string, string][];
}) {
  const discriminatorMappingObj = Array.isArray(discriminatorMapping)
    ? Object.fromEntries(discriminatorMapping)
    : discriminatorMapping;
  interfaceType.resolveType = function discriminatorDirectiveHandler(data) {
    const discriminatorValue = data[discriminatorField];
    return discriminatorMappingObj?.[discriminatorValue] || discriminatorValue;
  };
}
