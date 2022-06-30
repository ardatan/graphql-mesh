export function getHeadersObj(headers: Headers): Record<string, string> {
  return new Proxy(
    {},
    {
      get(_target, name) {
        return headers.get(name.toString());
      },
      has(_target, name) {
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
    }
  );
}
