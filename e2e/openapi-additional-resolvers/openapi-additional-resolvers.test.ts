import { createTenv } from "@e2e/tenv";
import fastify from "fastify";

const { compose, serve } = createTenv(__dirname);

const app = fastify();

app.post("/main", function (request, reply) {
  reply.send({
    apple: 'correct'
  });
});

app.get("/main", function (request, reply) {
  reply.send({
    apple: 'bad'
  });
});

describe("OpenAPI Additional Resolvers", () => {
  beforeAll(() => {
    app.listen({ port: 3000 });
  });

  afterAll(() => {
    app.close();
  });

  it("should work when pruned", async () => {
    const { output, result } = await compose({ output: "graphql" });

    expect(result).toMatchSnapshot();

    const { execute } = await serve({ supergraph: output });
    const queryResult = await execute({
      query: /* GraphQL */ `
        mutation Main {
          post_main(input: { banana: true }) {
            apple
          }
        }
      `,
    });

    expect(queryResult.data).toEqual({
      post_main: [
        {
          apple: 'correct',
        },
      ],
    });
  });
});
