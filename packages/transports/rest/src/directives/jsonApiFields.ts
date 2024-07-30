import type { GraphQLResolveInfo } from 'graphql';
import graphqlFields from 'graphql-fields';

function handleFields(fields: any) {
  const fieldsStrsArray: string[] = [];
  for (const fieldName in fields) {
    const subFields = fields[fieldName];
    const subFieldsStr = handleFields(subFields);
    let fieldStr = fieldName;
    if (subFieldsStr) {
      fieldStr += `(${subFieldsStr})`;
    }
    fieldsStrsArray.push(fieldStr);
  }
  return fieldsStrsArray.join(',');
}

export function getJsonApiFieldsQuery(info: GraphQLResolveInfo) {
  const fields = graphqlFields(info);
  return handleFields(fields);
}
