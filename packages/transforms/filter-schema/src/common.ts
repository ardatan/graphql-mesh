import { GraphQLFieldConfig, GraphQLFieldConfigArgumentMap } from 'graphql';

export type FieldArgumentFilter = (fieldName: string, argName: string) => boolean;

export function filterFieldArguments(
  fieldName: string,
  fieldConfig: GraphQLFieldConfig<any, any>,
  argFilter: FieldArgumentFilter
) {
  const args = Object.keys(fieldConfig.args)
    .filter((argName: string) => argFilter(fieldName, argName))
    .reduce((prev, key) => {
      prev[key] = fieldConfig.args[key];
      return prev;
    }, {} as GraphQLFieldConfigArgumentMap);

  return { ...fieldConfig, args };
}
