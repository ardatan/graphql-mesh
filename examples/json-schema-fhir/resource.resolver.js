module.exports = {
  Reference: {
    resource: {
      selectionSet: `{ reference }`,
      resolve: async ({ reference }, _, { FHIR }) => {
        const [type, id] = reference.split('/');
        return FHIR.api.resource({ type, id });
      },
    },
  },
};
