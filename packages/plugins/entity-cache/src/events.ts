import type { EntityInvalidation } from './types.js';

// #9658: the transport and trusted API share one bounded input contract.
export class EntityInvalidationInputError extends Error {}
export function validateEntityInvalidation(input: unknown): asserts input is EntityInvalidation {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new EntityInvalidationInputError('invalid entity batch');
  const value = input as EntityInvalidation;
  const text = (item: unknown, maximum: number): item is string =>
    typeof item === 'string' && item.length > 0 && item.length <= maximum;
  if (
    !text(value.source, 128) ||
    !text(value.entityType, 128) ||
    !text(value.scope, 256) ||
    (value.identities !== undefined &&
      (!Array.isArray(value.identities) ||
        !value.identities.length ||
        value.identities.length > 1000 ||
        !value.identities.every(key => text(key, 256))))
  ) {
    throw new EntityInvalidationInputError('invalid entity batch');
  }
  if (
    value.event !== undefined &&
    (!value.identities ||
      !value.event ||
      !text(value.event.id, 128) ||
      !Number.isSafeInteger(value.event.version) ||
      value.event.version < 0)
  ) {
    throw new EntityInvalidationInputError('invalid entity event');
  }
}
