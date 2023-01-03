/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { createRouter, RouterRequest, Response } from '@whatwg-node/router';
import { createServer, Server } from 'http';
import { withCookies } from 'itty-router-extras';

/**
 * Starts the server at the given port
 */
export function startServer() {
  const app = createRouter();

  app.all('*', withCookies as any);

  const Users = {
    arlene: {
      username: 'arlene',
      name: 'Arlene L McMahon',
      address: {
        street: '4656 Cherry Camp Road',
        city: 'Elk Grove Village',
      },
      address2: {
        street: '3180 Little Acres Lane',
        city: 'Macomb',
      },
      employerId: 'binsol',
      hobbies: ['tap dancing', 'bowling'],
      status: 'staff',
      nomenclature: {
        suborder: 'Haplorhini',
        family: 'Hominidae',
        genus: 'Homo',
        species: 'sapiens',
      },
      friends: ['will', 'johnny', 'heather'],
    },
    will: {
      username: 'will',
      name: 'William B Ropp',
      address: {
        street: '3180 Little Acres Lane',
        city: 'Macomb',
      },
      employerId: 'binsol',
      hobbies: ['tap dancing', 'baseball'],
      status: 'staff',
      nomenclature: {
        suborder: 'Haplorhini',
        family: 'Hominidae',
        genus: 'Homo',
        species: 'sapiens',
      },
      friends: ['arlene', 'johnny'],
    },
    johnny: {
      username: 'johnny',
      name: 'John C Barnes',
      address: {
        street: '372 Elk Rd Little',
        city: 'Tucson',
      },
      employerId: 'binsol',
      hobbies: ['chess', 'tennis'],
      status: 'staff',
      nomenclature: {
        suborder: 'Haplorhini',
        family: 'Hominidae',
        genus: 'Homo',
        species: 'sapiens',
      },
      friends: ['arlene'],
    },
    heather: {
      username: 'heather',
      name: 'Heather J Tate',
      address: {
        street: '3636 Poplar Chase Lane',
        city: 'Post Falls',
      },
      employerId: 'ccc',
      hobbies: ['making money', 'counting money'],
      status: 'alumni',
      nomenclature: {
        suborder: 'Haplorhini',
        family: 'Hominidae',
        genus: 'Homo',
        species: 'ihavelotsofmoneyus',
      },
      friends: [] as string[],
    },
  };

  const Cars = {
    arlene: {
      model: 'Retro Rides',
      color: 'yellow',
      kind: 'SEDAN',
      rating: 100,
      features: {
        color: 'banana yellow to be specific',
      },
    },
    will: {
      model: 'Speedzone Speedster',
      color: 'red',
      tags: {
        speed: 'extreme',
      },
      kind: 'RACE_CAR',
      rating: 100,
    },
    johnny: {
      model: 'Glossy German',
      color: 'silver',
      tags: {
        impression: 'decadent',
        condition: 'slightly beat-up',
      },
      kind: 'LIMOSINE',
      rating: 101,
    },
    heather: {
      model: 'Glossy German',
      color: 'black',
      tags: {
        impression: 'decadent',
      },
      kind: 'LIMOSINE',
      rating: 200,
    },
  };

  const Companies = {
    binsol: {
      id: 'binsol',
      name: 'Binary Solutions',
      legalForm: 'public',
      ceoUsername: 'johnny',
      offices: [
        {
          street: '122 Elk Rd Little',
          city: 'Tucson',
        },
        {
          street: '124 Elk Rd Little',
          city: 'Tucson',
        },
      ],
    },
    ccc: {
      id: 'ccc',
      name: 'Cool Computers Company',
      legalForm: 'public',
      ceoUsername: 'heather',
      offices: [
        {
          street: '300 Elk Rd Little',
          city: 'Tucson',
        },
        {
          street: '301 Elk Rd Little',
          city: 'Tucson',
        },
      ],
    },
  };

  const Offices = [
    {
      employeeId: 'arlene',
      'room number': 100,
      employerId: 'binsol',
    },
    {
      employeeId: 'will',
      'room number': 101,
      employerId: 'binsol',
    },
    {
      employeeId: 'johnny',
      'room number': 102,
      employerId: 'binsol',
    },
    {
      employeeId: 'heather',
      'room number': 100,
      employerId: 'ccc',
    },
  ];

  const Patents = {
    'CCC OSv1': {
      'patent-id': '100',
      'inventor-id': 'heather',
    },
  };

  const Projects = {
    'Peace Among Companies': {
      projectId: 1,
      active: true,
      leadId: 'arlene',
      patentId: '',
    },
    'Operation: Control CCC': {
      projectId: 2,
      active: false,
      leadId: 'will',
      patentId: '',
    },
    'CCC operation system': {
      projectId: 3,
      active: true,
      leadId: 'will',
      patentId: '100',
    },
  };

  const Papers = {
    apples: {
      name: 'Deliciousness of apples',
      published: true,
    },
    coffee: {
      name: 'How much coffee is too much coffee?',
      published: false,
    },
    tennis: {
      name: 'How many tennis balls can fit into the average building?',
      published: true,
    },
  };

  const TrashCans = {
    arlene: {
      brand: 'Garbage Emporium',
      contents: [
        {
          type: 'apple',
          message: 'Half-eaten',
        },
        {
          type: 'sock',
          message: 'Lost one',
        },
      ],
    },
    will: {
      brand: 'Garbage Emporium',
      contents: [
        {
          type: 'sock',
          message: 'Lost one',
        },
      ],
    },
    johnny: {
      brand: 'Garbage Emporium',
      contents: [] as { type: string; message: string }[],
    },
    heather: {
      brand: 'Solid Gold Products',
      contents: [
        {
          type: 'tissue',
          message: 'Used',
        },
      ],
    },
  };

  const Auth = {
    arlene: {
      username: 'arlene123',
      password: 'password123',
      accessToken: 'abcdef',
    },
    will: {
      username: 'catloverxoxo',
      password: 'IActuallyPreferDogs',
      accessToken: '123456',
    },
    johnny: {
      username: 'johnny',
      password: 'password',
      accessToken: 'xyz',
    },
    heather: {
      username: 'cccrulez',
      password: 'johnnyisabully',
      accessToken: 'ijk',
    },
  };

  const authMiddleware = (req: RouterRequest): void | Response => {
    const authHeader = req.headers.get('authorization');
    const accessTokenHeader = req.headers.get('access_token');
    const cookieHeader = req.headers.get('cookie');
    if (authHeader) {
      const tokenizedAuth = authHeader.split(' ');

      if (tokenizedAuth.length === 2) {
        const authType = tokenizedAuth[0];
        const authValue = tokenizedAuth[1];

        if (authType === 'Basic') {
          // Decode username and password
          const decoded = Buffer.from(authValue, 'base64').toString('utf8').split(':');

          if (decoded.length === 2) {
            const credentials = {
              username: decoded[0],
              password: decoded[1],
            };

            for (const user in Auth) {
              if (
                Auth[user].username === credentials.username &&
                Auth[user].password === credentials.password
              ) {
                return undefined;
              }
            }
          } else {
            return new Response(
              JSON.stringify({
                message: 'Basic Auth expects a single username and a single password',
              }),
              {
                status: 401,
                headers: {
                  'Content-Type': 'application/json',
                },
              },
            );
          }
        } else if (authType === 'Bearer') {
          if (authValue === 'master-bearer-token') {
            return undefined;
          }
        }
      }
    } else if (accessTokenHeader) {
      for (const user in Auth) {
        if (Auth[user].accessToken === accessTokenHeader) {
          return undefined;
        }
      }
      return new Response(
        JSON.stringify({
          message: 'Incorrect credentials',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    } else if (cookieHeader) {
      for (const user in Auth) {
        if (Auth[user].accessToken === cookieHeader.split('=')[1]) {
          return undefined;
        }
      }
      return new Response(
        JSON.stringify({
          message: 'Incorrect credentials',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    } else if ('access_token' in req.query) {
      for (const user in Auth) {
        if (Auth[user].accessToken === req.query.access_token) {
          return undefined;
        }
      }
      return new Response(
        JSON.stringify({
          message: 'Incorrect credentials',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    } else {
      return new Response(
        JSON.stringify({
          message: 'Unknown/missing credentials',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  };

  app.get('/api/users', req => {
    const limit = req.query.limit;
    if (typeof limit === 'string') {
      const results = Object.values(Users).slice(0, Number(limit));
      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(null, {
        status: 400,
      });
    }
  });

  app.get('/api/users/:username', req => {
    if (req.params.username in Users) {
      const results = Users[req.params.username];
      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong username',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.get('/api/users/:username/car', req => {
    if (req.params.username in Users) {
      const results = Cars[req.params.username];
      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong username',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.get('/api/users/:username/friends', req => {
    if (req.params.username in Users) {
      const results = Users[req.params.username].friends.map((friendName: string | number) => {
        return Users[friendName];
      });

      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong username',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.post('/api/users', async req => {
    const user: any = await req.json();
    if ('name' in user && 'address' in user && 'employerId' in user && 'hobbies' in user) {
      return new Response(JSON.stringify(user), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong data',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.get('/api/assets/:companyId', req => {
    const assets: {
      name: string;
      address: { street: string; city: string };
      employerId: string;
      hobbies: string[];
      status: string;
      nomenclature: { suborder: string; family: string; genus: string; species: string };
      friends: string[];
    }[] = [];
    Object.entries(Users).forEach(([username, user]) => {
      if (req.params.companyId === user.employerId) {
        assets.push(user);

        if (username in Cars) {
          assets.push(Cars[username]);
        }

        if (username in TrashCans) {
          assets.push(TrashCans[username]);
        }
      }
    });

    return new Response(JSON.stringify(assets), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  app.get('/api/cars', req => {
    return new Response(JSON.stringify(Object.values(Cars)), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  app.get('/api/companies/:id', req => {
    if (req.params.id in Companies) {
      return new Response(JSON.stringify(Companies[req.params.id]), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong company ID',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.get('/api/coffeeLocation', req => {
    return new Response(
      JSON.stringify({
        lat: parseFloat(req.query.lat.toString()) + 5,
        long: parseFloat(req.query.long.toString()) + 5,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  app.get('/api/cookie', (req: RouterRequest & { cookies: Record<string, string> }) => {
    if (req.cookies && req.cookies.cookie_type && req.cookies.cookie_size) {
      return new Response(
        `You ordered a ${req.cookies.cookie_size} ${req.cookies.cookie_type} cookie!`,
        {
          headers: {
            'Content-Type': 'text/plain',
          },
        },
      );
    } else {
      return new Response('Need cookie header parameter', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  });

  app.get('/api/copier', req => {
    return new Response(
      JSON.stringify({
        body: req.query.query,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  app.get('/api/cleanDesks', req => {
    return new Response('5 clean desks', {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  });

  app.get('/api/dirtyDesks', req => {
    return new Response('5 dirty desks', {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  });

  app.get('/api/bonuses', req => {
    return new Response(null, {
      status: 204,
    });
  });

  app.get('/api/offices/:id', req => {
    const accept = req.headers.get('Accept');
    if (accept.includes('text/plain')) {
      return new Response('You asked for text!', {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } else if (accept.includes('application/json')) {
      const id = parseInt(req.params.id);
      if (id >= 0 && id < Offices.length) {
        return new Response(JSON.stringify(Offices[id]), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        return new Response(
          JSON.stringify({
            message: 'Cannot find office',
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }
    } else {
      return new Response('Please try with an accept parameter!', {
        status: 412,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  });

  app.post('/api/products', async req => {
    const product: any = await req.json();

    if ('product-name' in product && 'product-id' in product && 'product-tag' in product) {
      return new Response(JSON.stringify(product), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong data',
        }),
        {
          status: 400,
        },
      );
    }
  });

  app.get('/api/products/:id', req => {
    if (typeof req.params.id !== 'undefined' && typeof req.query['product-tag'] !== 'undefined') {
      const product = {
        'product-id': req.params.id,
        'product-tag': req.query['product-tag'],
        'product-name': 'Super Product',
      };

      return new Response(JSON.stringify(product), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong data',
        }),
        {
          status: 400,
        },
      );
    }
  });

  app.get('/api/products/:id/reviews', req => {
    if (typeof req.params.id !== 'undefined' && typeof req.query['product-tag'] !== 'undefined') {
      const reviews = [
        { text: 'Great product', timestamp: 1502787600000000 },
        { text: 'I love it', timestamp: 1502787400000000 },
      ];
      return new Response(JSON.stringify(reviews), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong data',
        }),
        {
          status: 400,
        },
      );
    }
  });

  app.get('/api/papers', req => {
    return new Response(JSON.stringify(Object.values(Papers)), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  app.post('/api/papers', async (req: Request) => {
    const contentType = req.headers.get('Content-Type');
    if (contentType.includes('text/plain')) {
      const body = await req.text();
      return new Response('You sent the paper idea: ' + body, {
        headers: {
          'Content-Type': 'text/plain',
        },
        status: 201,
      });
    } else {
      return new Response(
        JSON.stringify({
          message: "Wrong content-type, expected 'text/plain' but received " + contentType,
        }),
        {
          status: 400,
        },
      );
    }
  });

  app.get('/api/patents/:id', authMiddleware, req => {
    // Find patent based off of patent ID
    const patent = Object.values(Patents).find(currentPatent => {
      return currentPatent['patent-id'] === req.params.id;
    });

    if (typeof patent === 'object') {
      return new Response(JSON.stringify(patent), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Patent does not exist.',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.post('/api/projects', authMiddleware, req => {
    const project = req.body;

    if ('project-id' in project && 'lead-id' in project) {
      return new Response(JSON.stringify(project), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong data',
        }),
        {
          status: 400,
        },
      );
    }
  });

  app.get('/api/projects/:id', authMiddleware, req => {
    // Find project based off of projectId
    const project = Object.values(Projects).find(currentProject => {
      return currentProject.projectId === Number(req.params.id);
    });

    if (typeof project === 'object') {
      return new Response(JSON.stringify(project), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Project does not exist.',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.get('/api/scanner', req => {
    const body = req.query.query;
    return new Response(JSON.stringify({ body }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  app.post('/api/scanner/:path', async req => {
    const reqBody = await req.text();
    return new Response(
      JSON.stringify({
        body: `req.body: ${reqBody}, req.query.query: ${req.query.query}, req.path.path: ${req.params.path}`,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  app.get('/api/snack', (req: Request) => {
    const snackType = req.headers.get('snack_type');
    const snackSize = req.headers.get('snack_size');
    if (snackType && snackSize) {
      return new Response(`Here is a ${snackSize} ${snackType}`, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } else {
      return new Response('Need snack_type and snack_size header parameters', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  });

  app.get('/api/status', req => {
    if (
      typeof req.query.limit !== 'undefined' &&
      typeof req.headers.get('exampleHeader') !== 'undefined'
    ) {
      return new Response('Ok', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'wrong request',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.post('/api/status', async req => {
    const reqBody: any = await req.json();
    if ('hello' in reqBody && reqBody.hello === 'world') {
      return new Response('success', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: "Wrong data, try 'hello': 'world'",
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.get('/api/secure', (req: Request) => {
    if (req.headers.get('authorization') === 'Bearer abcdef') {
      return new Response('A secure message.', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Missing authorization header',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.get('/api/trashcans', req => {
    return new Response(JSON.stringify(Array.from(Object.values(TrashCans))), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  app.get('/api/trashcans/:username', req => {
    if (req.params.username in Users) {
      return new Response(JSON.stringify(TrashCans[req.params.username]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong username',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.post('/api/trashcans/:username', async req => {
    const trashItem = await req.json();

    if (req.params.username in Users) {
      const trashCan = TrashCans[req.params.username];
      trashCan.contents.push(trashItem);
      return new Response(JSON.stringify(trashCan), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          message: 'Wrong username',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  });

  app.get('/api/random', req => {
    return new Response(
      JSON.stringify({
        status: 'success',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  const server = createServer(app);
  return new Promise<Server>(resolve => {
    server.listen(0, () => {
      resolve(server);
    });
  });
}
