import { GraphQLError, type ExecutionResult } from 'graphql';
;

export function handleSerializedErrors(serializedResult: ExecutionResult) {
  if (serializedResult.errors?.length) {
    const coercedErrors = serializedResult.errors.map((error: any) =>
      error instanceof Error ? error : new GraphQLError(error.message, error),
    );
    if (coercedErrors.length === 1) {
      throw coercedErrors[0];
    }
    throw new AggregateError(
      coercedErrors,
      'Received multiple errors\n' + coercedErrors.map(e => e.stack || e.message).join('\n'),
    );
  }
}
