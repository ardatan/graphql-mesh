/* eslint-disable import/no-extraneous-dependencies */
import { GraphQLSchema } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';

type TransformMode = 'wrap' | 'bare';
type TransformSchemaFunction = (schema: GraphQLSchema, transformer: any) => GraphQLSchema;

const createTransformSchemaFunction =
  (mode: 'wrap' | 'bare'): TransformSchemaFunction =>
  (schema: GraphQLSchema, transformer: any) => {
    switch (mode) {
      case 'wrap':
        return wrapSchema({
          schema,
          transforms: [transformer],
        });
      case 'bare':
        return transformer.transformSchema(schema, {} as any);
      default:
        throw new Error(`Mode '${mode}' is not supported!`);
    }
  };

/**
 * Creates test suites with the defined tests for each available mode.
 * Available modes: 'wrap', 'bare'
 *
 * @param name Name of test suites
 * @param testSuiteFactory Factory method that creates the test cases
 */
export function describeTransformerTests(
  name: string,
  testSuiteFactory: ({
    mode,
    transformSchema,
  }: {
    mode: TransformMode;
    transformSchema: TransformSchemaFunction;
  }) => void,
) {
  const modes: TransformMode[] = ['wrap', 'bare'];
  for (const mode of modes) {
    describe(`${name} (${mode})`, () => {
      testSuiteFactory({ mode, transformSchema: createTransformSchemaFunction(mode) });
    });
  }
}
