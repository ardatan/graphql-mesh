import { Kind, parse } from 'graphql';
import { matchPrintedFieldBlock } from '@e2e/printed-sdl';
import { createTenv, type Container } from '@e2e/tenv';

const { compose, service, serve, container } = createTenv(__dirname);

let petstore!: Container;
beforeAll(async () => {
  petstore = await container({
    name: 'petstore',
    image: 'swaggerapi/petstore3:1.0.7',
    containerPort: 8080,
    healthcheck: ['CMD-SHELL', 'wget --spider http://localhost:8080'],
  });
});

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [petstore, await service('vaccination')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();

  // Connectors entity contract (arg ≠ key → type-level `$this`, no Mesh `@merge` on REST):
  // Query keeps `$args.petId`; Pet entity connector uses `/pet/{$this.id}`.
  expect(result).toMatch(/getPetById\([\s\S]*\$args\.petId/);
  expect(result).toMatch(
    /type Pet[\s\S]*@join__directive\([\s\S]*name:\s*"connect"[\s\S]*\$this\.id/,
  );
  const getPetByIdField = matchPrintedFieldBlock(result, /getPetById\([\s\S]*?\):\s*Pet/);
  expect(getPetByIdField).toContain('$args.petId');
  expect(getPetByIdField).not.toContain('@merge');
  // GraphQL vaccination subgraph uses Federation Spec `@lookup` (auto-type-merging),
  // carried on the final SG as `@join__directive` (graphs: owns attribution).
  const doc = parse(result, { noLocation: true });
  const queryType = doc.definitions.find(
    d => d.kind === Kind.OBJECT_TYPE_DEFINITION && d.name.value === 'Query',
  );
  expect(queryType?.kind).toBe(Kind.OBJECT_TYPE_DEFINITION);
  const petById =
    queryType?.kind === Kind.OBJECT_TYPE_DEFINITION
      ? queryType.fields?.find(f => f.name.value === 'petById')
      : undefined;
  expect(petById).toBeTruthy();
  const lookupJoin = (petById?.directives || []).find(dir => {
    if (dir.name.value !== 'join__directive') return false;
    const nameArg = dir.arguments?.find(a => a.name.value === 'name');
    return nameArg?.value.kind === Kind.STRING && nameArg.value.value === 'lookup';
  });
  expect(lookupJoin).toBeTruthy();
  const graphsArg = lookupJoin?.arguments?.find(a => a.name.value === 'graphs');
  expect(graphsArg?.value.kind).toBe(Kind.LIST);
  if (graphsArg?.value.kind === Kind.LIST) {
    const graphNames = graphsArg.value.values
      .filter(v => v.kind === Kind.ENUM)
      .map(v => (v.kind === Kind.ENUM ? v.value : ''));
    expect(graphNames).toEqual(['VACCINATION']);
  }
});

// Hive-only: vaccination is a plain GraphQL schema merged via Federation Spec `@lookup`.
// Apollo Router plans Federation `_entities` against it and fails validation
// (`Unknown type "_Any"` / `Cannot query field "_entities"`). Making vaccination
// a Federation subgraph would dual-run, but would abandon the `@lookup` test intent.
it('should execute GetPet on hive', async () => {
  const { output } = await compose({
    output: 'graphql',
    services: [petstore, await service('vaccination')],
  });
  const { execute } = await serve({ runner: 'hive', supergraph: output });
  const result = await execute({
    query: /* GraphQL */ `
      query GetPet {
        getPetById(petId: 1) {
          __typename
          id
          name
          vaccinated
        }
      }
    `,
  });
  expect(result.errors).toBeFalsy();
  expect(result.data).toEqual({
    getPetById: {
      __typename: 'Pet',
      id: 1,
      name: 'Cat 1',
      vaccinated: false,
    },
  });
});
