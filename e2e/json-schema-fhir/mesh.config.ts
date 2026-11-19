import { join } from 'node:path';
import { OperationTypeNode, type GraphQLSchema } from 'graphql';
import {
  createPrefixTransform,
  createPruneTransform,
  defineConfig as defineComposeConfig,
} from '@graphql-mesh/compose-cli';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';
import { MapperKind, mapSchema, pruneSchema } from '@graphql-tools/utils';
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
 * Keep only the fields this e2e exercises. Official `#/definitions/Patient|Observation`
 * still supply types/scalars; hard-remove + prune drops ResourceList/Extension explosion
 * so Apollo Router can load the Supergraph.
 *
 * Note: `createFilterTransform` marks filtered fields `@inaccessible` (Fed-friendly)
 * rather than deleting them — that still leaves thousands of scalars for Router.
 * This transform actually removes fields.
 */
const keepFieldsByType: Record<string, ReadonlySet<string>> = {
  // Omit resourceType — JSON Schema emits a `*_const` enum + `@typescript` that
  // Apollo Router 2.19 rejects when carrying Mesh directives ("already exists").
  Patient: new Set(['id', 'gender', 'name']),
  Observation: new Set(['id', 'status', 'subject']),
  HumanName: new Set(['family', 'given']),
  Reference: new Set(['reference', 'type', 'display']),
};

const fhirNoiseFields = new Set([
  'contained',
  'extension',
  'modifierExtension',
  'text',
  'meta',
]);

function keepField(typeName: string, fieldName: string): boolean {
  const keep = keepFieldsByType[typeName];
  if (keep) {
    return keep.has(fieldName);
  }
  if (fhirNoiseFields.has(fieldName)) {
    return false;
  }
  if (fieldName.startsWith('_') && fhirNoiseFields.has(fieldName.slice(1))) {
    return false;
  }
  return true;
}

function createHardFieldFilterTransform(
  filter: (typeName: string, fieldName: string) => boolean,
): (schema: GraphQLSchema) => GraphQLSchema {
  return (schema: GraphQLSchema) => {
    const filtered = mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) =>
        filter(typeName, fieldName) ? fieldConfig : null,
      [MapperKind.INPUT_OBJECT_FIELD]: (fieldConfig, fieldName, typeName) =>
        filter(typeName, fieldName) ? fieldConfig : null,
      [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) =>
        filter(typeName, fieldName) ? fieldConfig : null,
    });
    return pruneSchema(filtered);
  };
}

/**
 * FHIR e2e via JSON Schema loader + official `fhir.schema.json` definition pointers.
 *
 * Loading `#/definitions/Patient` and `#/definitions/Observation` in two subgraphs
 * pulls shared FHIR value types that share GraphQL names but not identical field
 * types. Rename collisions per subgraph via `createPrefixTransform`, keeping the
 * intentionally shared merge targets unprefixed:
 *
 * - `patients`: keep `Patient` (+ shared `code` when present)
 * - `observations`: keep `Observation`, `Reference`, `code`, `uri`
 * - `referenceResource` mini SDL (file path): `Reference.resource` → Patient stub
 *
 * Opt-in `scalarMap` (force-mapped despite some pattern mismatches):
 * date→Date, dateTime|instant→DateTime, uri|url|canonical→URL, uuid→UUID,
 * string→String, id|oid→ID. `code`/`markdown`/… stay `@regexp` — see fhir-scalar-map.ts.
 */
export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('patients', {
        endpoint: hapiBase,
        scalarMap: fhirScalarMap,
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'patient',
            method: 'GET',
            path: '/Patient/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: `${fhirSchema}#/definitions/Patient`,
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
      transforms: [
        createHardFieldFilterTransform(keepField),
        createPrefixTransform({
          value: 'patients_',
          // scalarMap → String/ID/Date/DateTime/URL/UUID; share `code` across subgraphs.
          ignore: ['Patient', 'code'],
          force: ['Duration', 'Time', 'JSON', 'JSONObject'],
        }),
        createPruneTransform(),
      ],
    },
    {
      sourceHandler: loadJSONSchemaSubgraph('observations', {
        endpoint: hapiBase,
        scalarMap: fhirScalarMap,
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'observationById',
            method: 'GET',
            path: '/Observation/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: `${fhirSchema}#/definitions/Observation`,
            selection: `
              id
              status
              subject {
                reference
                type
                display
              }
            `,
          },
        ],
      }),
      transforms: [
        createHardFieldFilterTransform(keepField),
        createPrefixTransform({
          value: 'observations_',
          // `uri`→URL via scalarMap (shared); keep `code` unprefixed for merge.
          ignore: ['Observation', 'Reference', 'code'],
          force: ['Duration', 'Time', 'JSON', 'JSONObject'],
        }),
        createPruneTransform(),
      ],
    },
    {
      name: 'referenceResource',
      // Compose accepts a path string — no readFileSync (see resolveSubgraphSchema).
      schema: join(import.meta.dirname, './subgraphs/reference-resource.graphql'),
    },
  ],
});
