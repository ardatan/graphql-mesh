import { join } from 'node:path';
import { OperationTypeNode } from 'graphql';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';
import { buildFhirScalarMap } from './fhir-scalar-map';

const hapiBase = 'https://hapi.fhir.org/baseR4';
/**
 * Official HL7 FHIR R4 JSON Schema, downloaded into this e2e package
 * (`yarn download-fhir-schema` / test `beforeAll`). Same source as
 * `examples/json-schema-fhir` — do not cross-import that package's file.
 */
const fhirSchema = join(import.meta.dirname, './fhir.schema.json');

/** Locked FHIR scalarMap (force-applied; see fhir-scalar-map.ts for mismatch notes). */
const fhirScalarMap = buildFhirScalarMap();

/**
 * FHIR e2e via JSON Schema loader + official `fhir.schema.json` definition pointers.
 *
 * - Opt-in `scalarMap` (force-mapped): date→Date, dateTime|instant→DateTime,
 *   uri|url|canonical→URL, uuid→UUID, string→String, id|oid→ID
 * - `json-machete` stable titles under `$resolvedRef` (no blanket prefix)
 * - Explicit `include` limits GraphQL emit; loader auto-expands `@connect(selection:)`
 *   for identity maps (no hand-written selection on patient / observationById)
 * - `referenceResource` mini SDL: `Reference.resource` → generic `Resource` with
 *   Connectors `->match` stub (non-identity — kept there)
 */
export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('patients', {
        endpoint: hapiBase,
        scalarMap: fhirScalarMap,
        include: {
          Patient: ['id', 'gender', 'name'],
          HumanName: ['family', 'given'],
        },
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'patient',
            method: 'GET',
            path: '/Patient/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: `${fhirSchema}#/definitions/Patient`,
          },
        ],
      }),
    },
    {
      sourceHandler: loadJSONSchemaSubgraph('observations', {
        endpoint: hapiBase,
        scalarMap: fhirScalarMap,
        include: {
          Observation: ['id', 'status', 'subject'],
          Reference: ['reference', 'type', 'display'],
        },
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'observationById',
            method: 'GET',
            path: '/Observation/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: `${fhirSchema}#/definitions/Observation`,
          },
        ],
      }),
    },
    {
      name: 'referenceResource',
      schema: join(import.meta.dirname, './subgraphs/reference-resource.graphql'),
    },
  ],
});
