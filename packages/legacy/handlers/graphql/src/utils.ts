/**
 * Query used when a GraphQL HTTP source exposes Federation `_service { sdl }`.
 * The underthehood federation merger composes that SDL; stitch merge configs are gone.
 */
export const SubgraphSDLQuery = /* GraphQL */ `
  query SubgraphSDL {
    _service {
      sdl
    }
  }
`;
