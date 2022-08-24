function headersToJSON(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

export function getHeadersObj(headers: Headers): Record<string, string> {
  if (headers == null || !('forEach' in headers)) {
    return headers as any;
  }
  return new Proxy(
    {},
    {
      get(_target, name) {
        if (name === 'toJSON') {
          return () => headersToJSON(headers);
        }
        return headers.get(name.toString());
      },
      has(_target, name) {
        if (name === 'toJSON') {
          return true;
        }
        return headers.has(name.toString());
      },
      ownKeys(_target) {
        const keys: string[] = [];
        headers.forEach((_value, name) => {
          keys.push(name);
        });
        return keys;
      },
      set(_target, name, value) {
        headers.set(name.toString(), value);
        return true;
      },
      deleteProperty(_target, name) {
        headers.delete(name.toString());
        return true;
      },
      preventExtensions() {
        return true;
      },
    }
  );
}
