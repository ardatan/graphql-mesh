import { createRouter, Response, Type } from 'fets';

const UserType = Type.Object(
  {
    id: Type.String(),
    name: Type.Optional(Type.String()),
    username: Type.Optional(Type.String()),
  },
  { title: 'User' },
);

const users = [
  {
    id: '1',
    name: 'Ada Lovelace',
    birthDate: '1815-12-10',
    username: '@ada',
  },
  {
    id: '2',
    name: 'Alan Turing',
    birthDate: '1912-06-23',
    username: '@complete',
  },
];

export const server = createRouter()
  .route({
    operationId: 'me',
    path: '/me',
    method: 'GET',
    schemas: {
      responses: {
        200: UserType,
      },
    },
    handler: () => Response.json(users[0]),
  })
  .route({
    operationId: 'user',
    path: '/users/:id',
    method: 'GET',
    schemas: {
      request: {
        params: Type.Object({
          id: Type.String(),
        }),
      },
      responses: {
        200: UserType,
      },
    },
    handler: ({ params }) => Response.json(users.find(user => user.id === params.id)),
  })
  .route({
    operationId: 'users',
    path: '/users',
    method: 'GET',
    schemas: {
      responses: {
        200: Type.Array(UserType),
      },
    },
    handler: () => Response.json(users),
  });
