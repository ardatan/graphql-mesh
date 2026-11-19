import { join } from 'node:path';
import { OperationTypeNode, type GraphQLSchema } from 'graphql';
import {
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
 * Field whitelist for a **small** Supergraph snapshot + Router load time.
 * Naming of shared FHIR defs is fixed in `json-machete` heal (`Duration_comparator`
 * etc.) — this filter is not a collision workaround. Without it the composed SG
 * is ~2MB (full `#/definitions/Patient|Observation` fan-out).
 */
const keepFieldsByType: Record<string, ReadonlySet<string>> = {
  // Omit resourceType — `*_const` + `@typescript` is noisy on Router when Mesh
  // dirs are carried alongside Connectors.
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
 * - Opt-in `scalarMap` (force-mapped): date→Date, dateTime|instant→DateTime,
 *   uri|url|canonical→URL, uuid→UUID, string→String, id|oid→ID
 * - `json-machete` stable titles under `$resolvedRef` (no blanket prefix)
 * - Field whitelist keeps the snap/Router SG small (not a naming workaround)
 * - `referenceResource` mini SDL: `Reference.resource` → Patient stub
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
      transforms: [createHardFieldFilterTransform(keepField), createPruneTransform()],
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
      transforms: [createHardFieldFilterTransform(keepField), createPruneTransform()],
    },
    {
      name: 'referenceResource',
      schema: join(import.meta.dirname, './subgraphs/reference-resource.graphql'),
    },
  ],
});
