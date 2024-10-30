import type { ExecutionResult } from 'graphql';
import { createGraphQLError } from '@graphql-tools/utils';

export function handleSerializedErrors(serializedResult: ExecutionResult) {
  if (serializedResult.errors?.length) {
    const coercedErrors = serializedResult.errors.map((error: any) =>
      error instanceof Error ? error : createGraphQLError(error.message, error),
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
