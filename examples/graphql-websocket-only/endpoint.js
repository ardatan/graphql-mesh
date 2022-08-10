const { GraphQLSchema, GraphQLObjectType, GraphQLString } = require('graphql');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: {
        type: GraphQLString,
        resolve: () => 'world',
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      dontChange: {
        type: GraphQLString,
        resolve: () => 'didntChange',
      },
    },
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      greetings: {
        type: GraphQLString,
        subscribe: async function* () {
          for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
            yield { greetings: hi };
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        },
      },
    },
  }),
});

useServer(
  { schema },
  new WebSocketServer({
    port: 54000,
    path: '/graphql',
  })
);

console.log('Listening on port 54000...');
