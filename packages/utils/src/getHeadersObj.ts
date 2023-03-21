function headersToJSON(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

function isHeaders(headers: any): headers is Headers {
  return headers != null && 'get' in headers && typeof headers.get === 'function';
}

export function getHeadersObj(headers: Headers | Record<string, string>): Record<string, string> {
  if (headers == null || !isHeaders(headers)) {
    return headers as any;
  }
  return new Proxy(
    {},
    {
      get(_target, name) {
        if (name === 'toJSON') {
          return () => headersToJSON(headers);
        }
        return headers.get(name.toString()) || undefined;
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
      defineProperty(_target, name, descriptor) {
        if (descriptor.value != null) {
          headers.set(name.toString(), descriptor.value);
        }
        return true;
      },
      getOwnPropertyDescriptor(_target, name) {
        const value = headers.get(name.toString());
        if (value == null) {
          return undefined;
        }
        return {
          configurable: true,
          enumerable: true,
          value,
          writable: true,
        };
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
