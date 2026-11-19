import { GraphQLID, GraphQLString, OperationTypeNode } from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLURL, GraphQLUUID } from 'graphql-scalars';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';

/**
 * Live HAPI FHIR base (override with `FHIR_BASE`).
 * Official HL7 FHIR R4 JSON Schema is downloaded beside this config
 * (`yarn download-fhir-schema` / test `beforeAll`).
 */
const fhirBase = process.env.FHIR_BASE || 'https://hapi.fhir.org/baseR4';

/**
 * Locked FHIR primitive → scalar map (force-apply for cleaner SG).
 * Guild scalars: Date / DateTime / URL / UUID + GraphQL String / ID.
 * Not mapped (stay FHIR `@regexp`): `code` / `markdown` / `base64Binary` / `xhtml`.
 * Known pattern mismatches (force-mapped anyway): date/DateTime/URL/UUID/oid breadth.
 */
const fhirScalarMap = {
  date: GraphQLDate,
  dateTime: GraphQLDateTime,
  instant: GraphQLDateTime,
  uri: GraphQLURL,
  url: GraphQLURL,
  canonical: GraphQLURL,
  uuid: GraphQLUUID,
  string: GraphQLString,
  id: GraphQLID,
  oid: GraphQLID,
};

/**
 * FHIR e2e via JSON Schema loader + official `fhir.schema.json` definition pointers.
 *
 * - Opt-in `scalarMap` (force-mapped)
 * - Full emit (no include / hard filter / compose snap) — hive + Router execution
 * - Operation `selection` = runtime `@connect` map only (not an emit filter)
 * - `referenceResource` Apollo-style hand SDL (`@link` + `@key`/`@connect` apps only)
 */
export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('patients', {
        endpoint: fhirBase,
        scalarMap: fhirScalarMap,
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'patient',
            method: 'GET',
            path: '/Patient/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: './fhir.schema.json#/definitions/Patient',
            selection: `
              id
              gender
              name {
                family
                given
              }
            `,
          },
        ],
      }),
    },
    {
      sourceHandler: loadJSONSchemaSubgraph('observations', {
        endpoint: fhirBase,
        scalarMap: fhirScalarMap,
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'observationById',
            method: 'GET',
            path: '/Observation/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: './fhir.schema.json#/definitions/Observation',
            selection: `
              id
              status
              subject {
                reference
              }
            `,
          },
        ],
      }),
    },
    {
      name: 'referenceResource',
      schema: './subgraphs/reference-resource.graphql',
    },
  ],
});
