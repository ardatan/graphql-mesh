import flatstr from 'flatstr';
export function flatString(str: string): string {
  return flatstr(str);
}

export function jsonFlatStringify<T>(
  data: T,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number
): string {
  return flatString(JSON.stringify(data, replacer, space));
}
