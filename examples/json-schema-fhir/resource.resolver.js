module.exports = {
  Reference: {
    resource: async ({ reference }, _, { FHIR }) => {
      const [type, id] = reference.split('/');
      return FHIR.api.resource({ type, id });
    }
  },
};
