import { MeshPlugin, YamlConfig } from '@graphql-mesh/types';

export default function useMeshSerializeHeaders(
  options: YamlConfig.SerializeHeadersConfig,
): MeshPlugin<any> {
  const map: Record<string, string> = {};
  for (const headerName of options.names) {
    map[headerName.toLowerCase()] = headerName;
  }
  function headersSerializer(headers: Headers) {
    const headersObj: Record<string, string> = {};
    for (const [key, value] of headers) {
      const finalKey = map[key] ?? key;
      headersObj[finalKey] = value;
    }
    return headersObj;
  }
  return {
    onFetch({ options }) {
      (options as any).headersSerializer = headersSerializer;
    },
  };
}
