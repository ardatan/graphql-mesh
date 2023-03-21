function headersToJSON(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

export function getHeadersObj(headers: Headers): Record<string, string> {
  if (headers == null || !('get' in headers)) {
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
        return [...headers.keys()];
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
    },
  );
}
