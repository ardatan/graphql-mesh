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

  const Authors = {
    arlene: {
      name: 'Arlene L McMahon',
      masterpieceTitle: 'software',
      // address: {
      //   street: '4656 Cherry Camp Road',
      //   city: 'Elk Grove Village'
      // },
      // employerId: 'binsol',
      // hobbies: ['tap dancing', 'bowling'],
      // status: 'staff',
      // nomenclature: {
      //   suborder: 'Haplorhini',
      //   family: 'Hominidae',
      //   genus: 'Homo',
      //   species: 'sapiens'
      // }
    },
    will: {
      name: 'William B Ropp',
      masterpieceTitle: '',
      // address: {
      //   street: '3180 Little Acres Lane',
      //   city: 'Macomb'
      // },
      // employerId: 'binsol',
      // hobbies: ['tap dancing', 'baseball'],
      // status: 'staff',
      // nomenclature: {
      //   suborder: 'Haplorhini',
      //   family: 'Hominidae',
      //   genus: 'Homo',
      //   species: 'sapiens'
      // }
    },
    johnny: {
      name: 'John C Barnes',
      masterpieceTitle: '',
      // address: {
      //   street: '372 Elk Rd Little',
      //   city: 'Tucson'
      // },
      // employerId: 'binsol',
      // hobbies: ['chess', 'tennis'],
      // status: 'staff',
      // nomenclature: {
      //   suborder: 'Haplorhini',
      //   family: 'Hominidae',
      //   genus: 'Homo',
      //   species: 'sapiens'
      // }
    },
    heather: {
      name: 'Heather J Tate',
      masterpieceTitle: '',
      // address: {
      //   street: '3636 Poplar Chase Lane',
      //   city: 'Post Falls'
      // },
      // employerId: 'ccc',
      // hobbies: ['making money', 'counting money'],
      // status: 'alumni',
      // nomenclature: {
      //   suborder: 'Haplorhini',
      //   family: 'Hominidae',
      //   genus: 'Homo',
      //   species: 'ihavelotsofmoneyus'
      // }
    },
  };

  const Books = {
    software: {
      title: 'The OpenAPI-to-GraphQL Cookbook',
      authorName: 'arlene',
    },
    frog: {
      title: 'One Frog, Two Frog, Red Frog, Blue Frog',
      authorName: 'will',
    },
    history: {
      title: 'A history on history',
      authorName: 'will',
    },
  };

  const NextWorks = {
    arlene: {
      title: 'OpenAPI-to-GraphQL for Power Users',
      authorName: 'arlene',
    },
    johnny: {
      title: 'A one, a two, a one two three four!',
      authorName: 'johnny',
    },
    heather: {
      title: 'What did the baby computer say to the father computer? Data.',
      authorName: 'heather',
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
      const decoded = Buffer.from(encoded, 'base64').toString('utf8').split(':');

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

  app.get('/api/authors/:authorId', (req, res) => {
    res.send(Authors[req.params.authorId]);
  });

  app.get('/api/books/:bookId', (req, res) => {
    res.send(Books[req.params.bookId]);
  });

  app.get('/api/nextWorks/:authorId', authMiddleware, (req, res) => {
    res.send(NextWorks[req.params.authorId]);
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
  startServer(3003);
}
