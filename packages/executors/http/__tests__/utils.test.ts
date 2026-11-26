import { GraphQLError } from 'graphql';
import { createGraphQLErrorForAbort } from '../src/utils.js';

describe('createGraphQLErrorForAbort', () => {
  it('handles a null abort reason without throwing', () => {
    const error = createGraphQLErrorForAbort(null);
    expect(error).toBeInstanceOf(GraphQLError);
    expect(error.message).toBe('Aborted');
  });

  it('handles a non-object abort reason', () => {
    const error = createGraphQLErrorForAbort('cancelled');
    expect(error.message).toBe('cancelled');
  });

  it('preserves GraphQLError instances', () => {
    const original = new GraphQLError('already graphql');
    expect(createGraphQLErrorForAbort(original)).toBe(original);
  });

  it('uses reason.message for Error-like reasons', () => {
    const error = createGraphQLErrorForAbort(new Error('boom'));
    expect(error.message).toBe('boom');
  });
});
