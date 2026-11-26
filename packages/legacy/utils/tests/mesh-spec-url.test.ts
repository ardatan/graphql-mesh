import { isMeshSpecLinkUrl, parseMeshSpecUrl } from '../src/mesh-spec.js';

describe('Mesh spec @link URL recognition', () => {
  it('accepts current specs.graphql-mesh.dev and prior guild.dev stamps', () => {
    expect(isMeshSpecLinkUrl('https://specs.graphql-mesh.dev/core/v0.1')).toBe(true);
    expect(isMeshSpecLinkUrl('https://the-guild.dev/graphql/mesh/spec/v1.0')).toBe(true);
    expect(parseMeshSpecUrl('https://specs.graphql-mesh.dev/thrift/v0.1')?.name).toBe('thrift');
    expect(parseMeshSpecUrl('https://the-guild.dev/graphql/mesh/spec/v1.0')?.legacy).toBe(true);
  });

  it('does not recognize unpublished middle prefixes', () => {
    expect(isMeshSpecLinkUrl('https://graphql-mesh.com/spec/v1.0')).toBe(false);
    expect(isMeshSpecLinkUrl('https://spec.graphql-mesh.dev/core/v0.1')).toBe(false);
    expect(parseMeshSpecUrl('https://graphql-mesh.com/spec/v1.0')).toBeNull();
    expect(parseMeshSpecUrl('https://spec.graphql-mesh.dev/core/v0.1')).toBeNull();
  });
});
