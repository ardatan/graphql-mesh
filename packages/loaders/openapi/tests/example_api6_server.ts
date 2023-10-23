/* eslint-disable import/no-extraneous-dependencies */
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
import { createRouter, Response } from 'fets';
import { parse as qsParse } from 'qs';

export const exampleApi6 = createRouter({ base: '/api' })
  .route({
    method: 'GET',
    path: '/object',
    handler: () => Response.json({ data: 'object' }),
  })
  .route({
    method: 'GET',
    path: '/object2',
    handler(req) {
      if (typeof req.headers.get('specialheader') === 'string') {
        return Response.json({
          data: `object2 with special header: '${req.headers.get('specialheader')}'`,
        });
      } else {
        return Response.json({ data: 'object2' });
      }
    },
  })
  .route({
    method: 'POST',
    path: '/formUrlEncoded',
    handler: async req => {
      const textBody = await req.text();
      const body = qsParse(textBody);
      return new Response(JSON.stringify(body), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  })
  .route({
    method: 'GET',
    path: '/cars/:id',
    handler: req => Response.json(`Car ID: ${req.params.id}`),
  })
  .route({
    method: 'GET',
    path: '/cacti/:cactusId',
    handler: req => Response.json(`Cactus ID: ${req.params.cactusId}`),
  })
  .route({
    method: 'GET',
    path: '/eateries/:eatery/breads/:breadName/dishes/:dishKey',
    handler: req =>
      Response.json(
        `Parameters combined: ${req.params.eatery} ${req.params.breadName} ${req.params.dishKey}`,
      ),
  })
  .route({
    method: 'GET',
    path: '/nestedReferenceInParameter',
    handler: req => {
      const queryData = qsParse(req.parsedUrl.search.slice(1));
      return new Response(stringifyRussianDolls(queryData.russianDoll), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  })
  .route({
    method: 'GET',
    path: '/strictGetOperation',
    handler: req => {
      if (req.headers.get('content-type')) {
        return new Response('Get request should not have Content-Type', {
          status: 400,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      } else {
        return new Response('Perfect!', {
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }
    },
  })
  .route({
    method: 'GET',
    path: '/noResponseSchema',
    handler: () =>
      new Response('Hello world', {
        headers: {
          'Content-Type': 'text/plain',
        },
      }),
  })
  .route({
    method: 'GET',
    path: '/returnNumber',
    handler: req => {
      return new Response(req.headers.get('number'), {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    },
  })
  .route({
    method: 'GET',
    path: '/testLinkWithNonStringParam',
    handler: () => Response.json({ hello: 'world' }),
  })
  .route({
    method: 'GET',
    path: '/testLinkwithNestedParam',
    handler: () => Response.json({ nesting1: { nesting2: 5 } }),
  });

// TODO: better types for this
function stringifyRussianDolls(russianDoll: any): any {
  if (!(typeof russianDoll.name === 'string')) {
    return '';
  }

  if (typeof russianDoll.nestedDoll === 'object') {
    return `${russianDoll.name}, ${stringifyRussianDolls(russianDoll.nestedDoll)}`;
  } else {
    return russianDoll.name;
  }
}
