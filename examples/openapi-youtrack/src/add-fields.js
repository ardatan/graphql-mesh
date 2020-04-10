const graphqlFields = require('graphql-fields');

// This function gets requested fields from GraphQLResolveInfo
// And passes them through `fields` parameter
module.exports = next => (root, args, context, info) => {
    const fields = Object.keys(graphqlFields(info));
    args.fields = fields.join(',');
    return next(root, args, context, info);
}
