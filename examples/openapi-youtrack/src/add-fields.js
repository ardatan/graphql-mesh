const graphqlFields = require('graphql-fields');

function handleFields(fields) {
  let fieldsStrsArray = [];
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

// This function gets requested fields from GraphQLResolveInfo
// And passes them through `fields` parameter
module.exports = next => (root, args, context, info) => {
  const fields = graphqlFields(info);
  const updatedArgs = { ...args, fields: handleFields(fields) };
  return next(root, updatedArgs, context, info);
};
