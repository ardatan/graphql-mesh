import { createRouter, Response } from 'fets';
import { Type } from '@sinclair/typebox';

export function createApp() {
  const users = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Doe' },
    { id: 3, name: 'John Smith' },
    { id: 4, name: 'Jane Smith' },
  ];

  return createRouter().route({
    method: 'POST',
    path: '/users_by_ids',
    operationId: 'usersByIds',
    schemas: {
      request: {
        json: Type.Object(
          {
            ids: Type.Array(Type.Number()),
          },
          { title: 'UsersByIdRequest' },
        ),
      },
      responses: {
        200: Type.Object(
          {
            results: Type.Array(
              Type.Object(
                {
                  id: Type.Number(),
                  name: Type.String(),
                },
                { title: 'User' },
              ),
            ),
          },
          { title: 'UsersByIdResponse' },
        ),
      },
    },
    async handler(req) {
      const body = await req.json();
      const ids = body.ids;
      const results = users.filter(user => ids.includes(user.id));
      return Response.json({
        results,
      });
    },
  });
}
