// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
// eslint-disable-next-line import/no-extraneous-dependencies
// eslint-disable-next-line import/no-extraneous-dependencies
import { parse as qsParse } from 'qs';
import { createRouter, Response } from '@whatwg-node/router';

export const exampleApi6 = createRouter({ base: '/api' });

exampleApi6.get('/object', () => {
  return new Response(JSON.stringify({ data: 'object' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi6.get('/object2', req => {
  if (typeof req.headers.get('specialheader') === 'string') {
    return new Response(
      JSON.stringify({
        data: `object2 with special header: '${req.headers.get('specialheader')}'`,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } else {
    return new Response(JSON.stringify({ data: 'object2' }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});

exampleApi6.post('/formUrlEncoded', async req => {
  const textBody = await req.text();
  const body = qsParse(textBody);
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi6.get('/cars/:id', req => {
  return new Response(JSON.stringify(`Car ID: ${decodeURIComponent(req.params.id)}`), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi6.get('/cacti/:cactusId', req => {
  return new Response(JSON.stringify(`Cactus ID: ${req.params.cactusId}`), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi6.get('/eateries/:eatery/breads/:breadName/dishes/:dishKey', req => {
  return new Response(
    JSON.stringify(
      `Parameters combined: ${req.params.eatery} ${req.params.breadName} ${decodeURIComponent(
        req.params.dishKey,
      )}`,
    ),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
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

exampleApi6.get('/nestedReferenceInParameter', req => {
  const queryData = qsParse(req.parsedUrl.search.slice(1));
  return new Response(stringifyRussianDolls(queryData.russianDoll), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi6.get('/strictGetOperation', req => {
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
});

exampleApi6.get('/noResponseSchema', () => {
  return new Response('Hello world', {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
});

exampleApi6.get('/returnNumber', req => {
  return new Response(req.headers.get('number'), {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
});

exampleApi6.get('/testLinkWithNonStringParam', () => {
  return new Response(JSON.stringify({ hello: 'world' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi6.get('/testLinkwithNestedParam', () => {
  return new Response(JSON.stringify({ nesting1: { nesting2: 5 } }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});
