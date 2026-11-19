import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  isObjectType,
  OperationTypeNode,
} from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import type { MeshFetch } from '@graphql-mesh/types';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  loadJSONSchemaSubgraph,
  loadNonExecutableGraphQLSchemaFromJSONSchemas,
} from '@omnigraph/json-schema';

const hapiBase = 'https://hapi.fhir.org/baseR4';

/**
 * FHIR e2e via JSON Schema loader (not hand-written Connectors SDL).
 *
 * Field sets follow `examples/json-schema-fhir/fhir.schema.json`. We cannot load
 * full `#/definitions/Patient` + `#/definitions/Observation` in two subgraphs:
 * both pull `contained` → `ResourceList` / `Extension` and emit incompatible
 * shared type names (and FHIR `string`/`code` scalars duplicate non-repeatable
 * `@regexp`/`@typescript` across subgraphs — Apollo Router rejects that).
 * `./schemas/*.json` keep the FHIR shapes without that explosion.
 *
 * - `patients` owns Patient + `patient(id:)` (`entity: true`)
 * - `observations` owns Observation; `Reference.resource` is a Patient stub
 */
export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('patients', {
        endpoint: hapiBase,
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'patient',
            method: 'GET',
            path: '/Patient/{args.id}?_format=application/json',
            requiredArgs: ['id'],
            responseSchema: './schemas/patient.json',
          },
        ],
      }),
    },
    {
      sourceHandler: (ctx: { fetch: MeshFetch; cwd: string; log: Logger }) => ({
        name: 'observations',
        schema$: loadNonExecutableGraphQLSchemaFromJSONSchemas('observations', {
          endpoint: hapiBase,
          fetch: ctx.fetch,
          cwd: ctx.cwd,
          log: ctx.log,
          operations: [
            {
              type: OperationTypeNode.QUERY,
              field: 'observationById',
              method: 'GET',
              path: '/Observation/{args.id}?_format=application/json',
              requiredArgs: ['id'],
              responseSchema: './schemas/observation.json',
              selection: `
id
status
subject {
  reference
  resource: {
    __typename: $("Patient")
    id: reference->split("/")->get(1)
  }
}
`,
            },
          ],
        }).then(addReferenceResourceField),
      }),
    },
  ],
});

/**
 * FHIR `Reference` has no `resource` field in the JSON Schema; the Mesh example
 * used `@resolveTo` / `@connect`. Add `resource: Patient` so Observation
 * `@connect(selection:)` can emit an entity stub (Apollo across-subgraphs style).
 */
function addReferenceResourceField(schema: GraphQLSchema): GraphQLSchema {
  const reference = schema.getType('Reference');
  if (!isObjectType(reference)) {
    throw new Error('FHIR observations subgraph: expected Reference type');
  }
  if (reference.getFields().resource) {
    return schema;
  }

  let patient = schema.getType('Patient');
  if (!isObjectType(patient)) {
    patient = new GraphQLObjectType({
      name: 'Patient',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
    schema = new GraphQLSchema({
      ...schema.toConfig(),
      types: [...schema.toConfig().types, patient],
    });
  }

  const patientType = patient;
  return mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name !== 'Reference') {
        return type;
      }
      const config = type.toConfig();
      return new GraphQLObjectType({
        ...config,
        fields: {
          ...config.fields,
          resource: {
            type: patientType,
            description: 'Resolved target of Reference.reference (Patient entity stub).',
          },
        },
      });
    },
  });
}
