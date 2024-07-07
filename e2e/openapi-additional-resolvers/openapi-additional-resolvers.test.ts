import { createTenv } from "@e2e/tenv";
import fastify from "fastify";

const { compose, serve } = createTenv(__dirname);

const app = fastify();

app.post("/good", function (request, reply) {
  reply.send({
    apple: JSON.stringify(request.body),
  });
});

app.post("/bad", function (request, reply) {
  reply.send({
    apple: JSON.stringify(request.body),
  });
});

describe("OpenAPI Additional Resolvers", () => {
  beforeAll(() => {
    app.listen({ port: 3000 });
  });

  afterAll(() => {
    app.close();
  });

  it("should work with untouched schema", async () => {
    const { output, result } = await compose({ output: "graphql" });

    expect(result).toMatchSnapshot();

    const { execute } = await serve({ supergraph: output });
    const queryResult = await execute({
      query: /* GraphQL */ `
        mutation Good {
          post_good(input: { banana: true }) {
            apple
          }
        }
      `,
    });

    expect(queryResult.data).toEqual({
      post_good: [
        {
          apple: '{"banana":true}',
        },
      ],
    });
  });

  it("should work with renamed argument", async () => {
    const { output, result } = await compose({ output: "graphql" });

    expect(result).toMatchSnapshot();

    const { execute } = await serve({ supergraph: output });
    const queryResult = await execute({
      query: /* GraphQL */ `
        mutation Bad {
          post_bad(requestBody: { banana: true }) {
            apple
          }
        }
      `,
    });

    expect(queryResult.data).toEqual({
      post_bad: [
        {
          apple: '{"banana":true}',
        },
      ],
    });
  });
});
