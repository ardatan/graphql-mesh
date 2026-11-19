import { GraphQLID, GraphQLString, OperationTypeNode } from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLURL, GraphQLUUID } from 'graphql-scalars';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';

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
 * - Endpoint from `process.env.FHIR_BASE` at compose time (e2e sets it)
 * - Opt-in `scalarMap` (force-mapped)
 * - Full emit (no include / hard filter / compose snap) - hive + Router execution
 * - Auto `@connect(selection:)` (no hand selection); loader leavesOnly-rebuilds
 *   when passthrough would truncate mid-type under visit budget / maxLength
 * - `./reference-resource.graphql` Apollo-style join-only hand SDL (no Query)
 */
export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('patients', {
        endpoint: process.env.FHIR_BASE!,
        scalarMap: fhirScalarMap,
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'patient',
            method: 'GET',
            path: '/Patient/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: './fhir.schema.json#/definitions/Patient',
          },
        ],
      }),
    },
    {
      sourceHandler: loadJSONSchemaSubgraph('observations', {
        endpoint: process.env.FHIR_BASE!,
        scalarMap: fhirScalarMap,
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'observationById',
            method: 'GET',
            path: '/Observation/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: './fhir.schema.json#/definitions/Observation',
          },
        ],
      }),
    },
    {
      name: 'referenceResource',
      schema: './reference-resource.graphql',
    },
  ],
});
