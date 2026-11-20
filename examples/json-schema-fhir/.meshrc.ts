import { GraphQLID } from 'graphql';

/**
 * Legacy Mesh FHIR example.
 * `scalarMap.id → GraphQLID` so resource `id` fields are GraphQL `ID` (not custom
 * `id` regexp scalar). Matches e2e `fhirScalarMap` for the id/oid titles.
 */
export default {
  sources: [
    {
      name: 'FHIR',
      handler: {
        jsonSchema: {
          // Handler already emits Connectors `@connect` for operations (v0 default).
          // Follow-up fetch stays Mesh `@resolveTo` - no hand `@connect` in additionalTypeDefs.
          endpoint: '{env.FHIR_BASE}',
          scalarMap: {
            id: GraphQLID,
            oid: GraphQLID,
          },
          operations: [
            {
              type: 'Query',
              field: 'resourceById',
              method: 'GET',
              path: '/{args.resourceType}/{args.id}?_format=application/json',
              responseSchema: './fhir.schema.json#/definitions/ResourceList',
            },
            {
              type: 'Query',
              field: 'resourceByName',
              method: 'GET',
              path: '/{args.resourceType}/?name={args.name}?_format=application/json',
              responseSchema: './fhir.schema.json#/definitions/Bundle',
            },
            {
              type: 'Query',
              field: 'resourceByOtherResourceId',
              method: 'GET',
              path: '/{args.resourceType}?subject={args.otherResourceType}/{args.otherResourceId}',
              responseSchema: './fhir.schema.json#/definitions/Bundle',
            },
          ],
        },
      },
    },
  ],

  additionalTypeDefs: /* GraphQL */ `
    extend type Reference {
      resource: ResourceList
        @resolveTo(
          sourceName: "FHIR"
          sourceTypeName: "Query"
          sourceFieldName: "resourceById"
          sourceArgs: {
            resourceType: "{root.reference|path_head}"
            id: "{root.reference|path_rest}"
          }
        )
    }
  `,

  documents: ['./example-queries/*.graphql'],
};
