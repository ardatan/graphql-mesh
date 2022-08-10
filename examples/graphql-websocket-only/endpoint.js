const { GraphQLSchema, GraphQLObjectType, GraphQLString } = require('graphql');
const { createServer } = require('http');
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

function start() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    useServer(
      { schema },
      new WebSocketServer({
        server,
        path: '/graphql',
      })
    );

    const sockets = new Set();
    server.on('connection', socket => {
      sockets.add(socket);
      server.once('close', () => sockets.delete(socket));
    });
    const stop = () =>
      new Promise(resolve => {
        for (const socket of sockets) {
          socket.destroy();
          sockets.delete(socket);
        }
        server.close(() => resolve());
      });

    server.on('error', err => reject(err));
    server.on('listening', () => resolve(stop));

    server.listen(54000);
  });
}

module.exports = { start };
