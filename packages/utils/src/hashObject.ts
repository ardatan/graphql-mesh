import objectHash from 'object-hash';

export function hashObject(value: any): string {
  return objectHash(value, { ignoreUnknown: true }).toString();
}
