import {
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLError,
  parse,
  type GraphQLSchema,
  type IntrospectionOptions,
  type IntrospectionQuery,
  type ParseOptions,
} from 'graphql';
import {
  inspect,
  isAsyncIterable,
  type AsyncExecutor,
  type ExecutionResult,
  type Executor,
  type SyncExecutor,
} from '@graphql-tools/utils';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';

function getSchemaFromIntrospection(
  introspectionResult: ExecutionResult<IntrospectionQuery>,
  options?: Parameters<typeof buildClientSchema>[1],
): GraphQLSchema {
  if (introspectionResult?.data?.__schema) {
    return buildClientSchema(introspectionResult.data, options);
  }
  if (introspectionResult?.errors) {
    const graphqlErrors = introspectionResult.errors.map(
      error => new GraphQLError(error.message, error),
    );
    if (introspectionResult.errors.length === 1) {
      throw graphqlErrors[0];
    } else {
      throw new AggregateError(graphqlErrors, 'Could not obtain introspection result');
    }
  }
  throw new GraphQLError(
    `Could not obtain introspection result, received the following as response; \n ${inspect(
      introspectionResult,
    )}`,
  );
}

export type SchemaFromExecutorOptions = Partial<IntrospectionOptions> &
  Parameters<typeof buildClientSchema>[1] &
  ParseOptions;

export function schemaFromExecutor(
  executor: SyncExecutor,
  context?: Record<string, any>,
  options?: SchemaFromExecutorOptions,
): GraphQLSchema;
export function schemaFromExecutor(
  executor: AsyncExecutor,
  context?: Record<string, any>,
  options?: SchemaFromExecutorOptions,
): Promise<GraphQLSchema>;
export function schemaFromExecutor(
  executor: Executor,
  context?: Record<string, any>,
  options?: SchemaFromExecutorOptions,
): MaybePromise<GraphQLSchema>;
export function schemaFromExecutor(
  executor: Executor,
  context?: Record<string, any>,
  options?: SchemaFromExecutorOptions,
): MaybePromise<GraphQLSchema> {
  const parsedIntrospectionQuery = parse(getIntrospectionQuery(options as any), options);
  return handleMaybePromise(
    () =>
      handleMaybePromise(
        () =>
          executor({
            document: parsedIntrospectionQuery,
            context,
          }),
        introspection => {
          if (isAsyncIterable(introspection)) {
            return readAsyncIterableResult(introspection);
          }
          return introspection;
        },
      ),
    introspection => getSchemaFromIntrospection(introspection, options),
  );
}

async function readAsyncIterableResult(
  iterable: AsyncIterable<any>,
): Promise<ExecutionResult<IntrospectionQuery>> {
  const iterator = iterable[Symbol.asyncIterator]();
  try {
    const { value } = await iterator.next();
    return value;
  } finally {
    // Close the iterator after reading (including when next fails).
    if (typeof iterator.return === 'function') {
      try {
        await iterator.return();
      } catch {
        // Ignore cleanup errors; the primary result/error takes precedence.
      }
    }
  }
}
