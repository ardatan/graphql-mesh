// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import express from 'express';
import * as bodyParser from 'body-parser';
import { Server } from 'http';

let server: Server; // holds server object for shutdown

/**
 * Starts the server at the given port
 */
export function startServer(PORT: number) {
  const app = express();

  app.use(bodyParser.text());
  app.use(bodyParser.json());

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

  const authMiddleware = (req: any, res: any, next: Function) => {
    if (req.headers.authorization) {
      const encoded = req.headers.authorization.split(' ')[1];
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8').split(':');

      if (decoded.length === 2) {
        const credentials = {
          username: decoded[0],
          password: decoded[1],
        };
        for (const user in Auth) {
          if (Auth[user].username === credentials.username && Auth[user].password === credentials.password) {
            return next();
          }
        }
        res.status(401).send({
          message: 'Incorrect credentials',
        });
      } else {
        console.log({ encoded, decoded });
        res.status(401).send({
          message: 'Basic Auth expects a single username and a single password',
        });
      }
    } else if ('access_token' in req.headers) {
      for (const user in Auth) {
        if (Auth[user].accessToken === req.headers.access_token) {
          return next();
        }
      }
      res.status(401).send({
        message: 'Incorrect credentials',
      });
      return false;
    } else if ('cookie' in req.headers) {
      for (const user in Auth) {
        if (Auth[user].accessToken === req.headers.cookie.split('=')[1]) {
          return next();
        }
      }
      res.status(401).send({
        message: 'Incorrect credentials',
      });
      return false;
    } else if ('access_token' in req.query) {
      for (const user in Auth) {
        if (Auth[user].accessToken === req.query.access_token) {
          return next();
        }
      }
      res.status(401).send({
        message: 'Incorrect credentials',
      });
    } else {
      res.status(401).send({
        message: 'Unknown/missing credentials',
      });
    }
  };

  app.get('/api/users', (req, res) => {
    const limit = req.query.limit;
    if (typeof limit === 'string') {
      const results = Object.values(Users).slice(0, Number(limit));
      res.send(results);
    } else {
      res.send(Object.values(Users));
    }
  });

  app.get('/api/users/:username', (req, res) => {
    if (req.params.username in Users) {
      res.send(Users[req.params.username]);
    } else {
      res.status(404).send({
        message: 'Wrong username',
      });
    }
  });

  app.get('/api/users/:username/car', (req, res) => {
    if (req.params.username in Users) {
      res.send(Cars[req.params.username]);
    } else {
      res.status(404).send({
        message: 'Wrong username',
      });
    }
  });

  app.get('/api/users/:username/friends', (req, res) => {
    if (req.params.username in Users) {
      const friends = Users[req.params.username].friends.map((friendName: string | number) => {
        return Users[friendName];
      });

      res.status(200).send(friends);
    } else {
      res.status(404).send({
        message: 'Wrong username',
      });
    }
  });

  app.post('/api/users', (req, res) => {
    const user = req.body;
    if ('name' in user && 'address' in user && 'employerId' in user && 'hobbies' in user) {
      res.status(201).send(user);
    } else {
      res.status(400).send({
        message: 'Wrong data',
      });
    }
  });

  app.get('/api/assets/:companyId', (req, res) => {
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

    res.send(assets);
  });

  app.get('/api/cars', (req, res) => {
    res.send(Object.values(Cars));
  });

  app.get('/api/companies/:id', (req, res) => {
    if (req.params.id in Companies) {
      res.status(200).send(Companies[req.params.id]);
    } else {
      res.status(404).send({
        message: 'Wrong company ID.',
      });
    }
  });

  app.get('/api/coffeeLocation', (req: any, res: any) => {
    res.send({
      lat: parseFloat(req.query.lat) + 5,
      long: parseFloat(req.query.long) + 5,
    });
  });

  app.get('/api/cookie', (req, res) => {
    if ('cookie' in req.headers) {
      res
        .set('Content-Type', 'text/plain')
        .status(200)
        .send(`Thanks for your cookie preferences: "${req.headers.cookie.trim()}"`);
    } else {
      res.status(400).send('Need Cookie header parameter');
    }
  });

  app.get('/api/copier', (req, res) => {
    res.status(200).send({
      body: req.query.query,
    });
  });

  app.get('/api/cleanDesks', (req, res) => {
    res.set('Content-Type', 'text/plain').status(200).send('5 clean desks');
  });

  app.get('/api/dirtyDesks', (req, res) => {
    res.set('Content-Type', 'text/plain').status(200).send('5 dirty desks');
  });

  app.get('/api/bonuses', (req, res) => {
    res.status(204).send();
  });

  app.get('/api/offices/:id', (req: any, res: any) => {
    const accept = req.headers.accept;
    if (accept.includes('text/plain')) {
      res.set('Content-Type', 'text/plain').status(200).send('You asked for text!');
    } else if (accept.includes('application/json')) {
      if (req.params.id >= 0 && req.params.id < Offices.length) {
        res.status(200).send(Offices[req.params.id]);
      } else {
        res.status(404).send({
          message: 'Cannot find office',
        });
      }
    } else {
      res.set('Content-Type', 'text/plain').status(412).send('Please try with an accept parameter!');
    }
  });

  app.post('/api/products', (req, res) => {
    const product = req.body;

    if ('product-name' in product && 'product-id' in product && 'product-tag' in product) {
      res.status(201).send(product);
    } else {
      res.status(400).send({
        message: 'wrong data',
      });
    }
  });

  app.get('/api/products/:id', (req, res) => {
    if (typeof req.params.id !== 'undefined' && typeof req.query['product-tag'] !== 'undefined') {
      const product = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        product_id: req.params.id,
        'product-tag': req.query['product-tag'],
        'product-name': 'Super Product',
      };

      res.status(200).send(product);
    } else {
      res.status(400).send({
        message: 'Wrong data',
      });
    }
  });

  app.get('/api/products/:id/reviews', (req, res) => {
    if (typeof req.params.id !== 'undefined' && typeof req.query['product-tag'] !== 'undefined') {
      res.status(200).send([
        { text: 'Great product', timestamp: 1502787600000000 },
        { text: 'I love it', timestamp: 1502787400000000 },
      ]);
    } else {
      res.status(400).send({
        message: 'wrong data',
      });
    }
  });

  app.get('/api/papers', (req, res) => {
    res.status(200).send(Object.values(Papers));
  });

  app.post('/api/papers', (req, res) => {
    const contentType = req.headers['content-type'];
    if (contentType.includes('text/plain')) {
      res
        .set('Content-Type', 'text/plain')
        .status(201)
        .send('You sent the paper idea: ' + req.body);
    } else {
      res.status(400).send({
        message: "Wrong content-type, expected 'text/plain' but received " + contentType,
      });
    }
  });

  app.get('/api/patents/:id', authMiddleware, (req, res) => {
    // Find patent based off of patent ID
    const patent = Object.values(Patents).find(currentPatent => {
      return currentPatent['patent-id'] === req.params.id;
    });

    if (typeof patent === 'object') {
      res.status(200).send(patent);
    } else {
      res.status(404).send({ message: 'Patent does not exist.' });
    }
  });

  app.post('/api/projects', authMiddleware, (req, res) => {
    const project = req.body;

    if ('project-id' in project && 'lead-id' in project) {
      res.status(201).send(project);
    } else {
      res.status(400).send({
        message: 'Wrong data',
      });
    }
  });

  app.get('/api/projects/:id', authMiddleware, (req, res) => {
    // Find project based off of projectId
    const project = Object.values(Projects).find(currentProject => {
      return currentProject.projectId === Number(req.params.id);
    });

    if (typeof project === 'object') {
      res.status(200).send(project);
    } else {
      res.status(404).send({ message: 'Project does not exist.' });
    }
  });

  app.get('/api/scanner', (req, res) => {
    res.status(200).send({ body: req.query.query });
  });

  app.post('/api/scanner/:path', (req, res) => {
    res.status(200).send({
      body: `req.body: ${req.body}, req.query.query: ${req.query.query}, req.path.path: ${req.params.path}`,
    });
  });

  app.get('/api/snack', (req, res) => {
    if ('snack_type' in req.headers && 'snack_size' in req.headers) {
      res
        .set('Content-Type', 'text/plain')
        .status(200)
        .send(`Here is a ${req.headers.snack_size} ${req.headers.snack_type}`);
    } else {
      res.status(400).send('Need snack_type and snack_size header parameters');
    }
  });

  app.get('/api/status', (req, res) => {
    if (typeof req.query.limit !== 'undefined' && typeof req.get('exampleHeader') !== 'undefined') {
      res.set('Content-Type', 'text/plain').status(200).send('Ok');
    } else {
      res.status(400).send({
        message: 'wrong request',
      });
    }
  });

  app.post('/api/status', (req, res) => {
    if ('hello' in req.body && req.body.hello === 'world') {
      res.status(200).send('success');
    } else {
      res.status(400).send({
        message: "Wrong data, try 'hello': 'world'",
      });
    }
  });

  app.get('/api/secure', (req, res) => {
    if (req.get('authorization') === 'Bearer abcdef') {
      res.status(200).set('Content-Type', 'text/plain').send('A secure message.');
    } else {
      res.status(401).send({
        message: 'Missing authorization header',
      });
    }
  });

  app.get('/api/trashcans', (req, res) => {
    res.status(200).send(Array.from(Object.values(TrashCans)));
  });

  app.get('/api/trashcans/:username', (req, res) => {
    if (req.params.username in Users) {
      res.status(200).send(TrashCans[req.params.username]);
    } else {
      res.status(404).send({
        message: 'Wrong username',
      });
    }
  });

  app.post('/api/trashcans/:username', (req, res) => {
    const trashItem = req.body;

    if (req.params.username in Users) {
      const trashCan = TrashCans[req.params.username];
      trashCan.contents.push(trashItem);
      res.status(201).send(TrashCans[req.params.username]);
    } else {
      res.status(404).send({
        message: 'Wrong username',
      });
    }
  });

  return new Promise(resolve => {
    server = app.listen(PORT, resolve as () => void);
  });
}

/**
 * Stops server.
 */
export function stopServer() {
  return new Promise(resolve => {
    server.close(resolve);
  });
}

// if run from command line, start server:
if (require.main === module) {
  startServer(3001);
}
