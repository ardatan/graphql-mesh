import { GraphQLID } from 'graphql';

/**
 * Opt-in JSON Schema `scalarMap` for the legacy FHIR example.
 * Maps FHIR primitive titles `id` / `oid` → GraphQL `ID` (not custom regexp scalars).
 */
export default {
  id: GraphQLID,
  oid: GraphQLID,
};
