// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { PubSub } from '@graphql-mesh/utils';
import * as bodyParser from 'body-parser';
import express from 'express';
import { Server } from 'http';

const app = express();

let server: Server; // holds server object for shutdown

export const pubsub = new PubSub();

const Devices = {
  'Audio-player': {
    name: 'Audio-player',
    userName: 'johnny',
  },
  Drone: {
    name: 'Drone',
    userName: 'eric',
  },
};

/**
 * Starts the server at the given port
 */
export function startServers(HTTP_PORT: number) {
  app.use(bodyParser.json());

  app.get('/api/user', (req, res) => {
    res.send({
      name: 'Arlene L McMahon',
    });
  });

  app.get('/api/devices', (req, res) => {
    res.status(200).send(Object.values(Devices));
  });

  app.post('/api/devices', (req, res) => {
    if (req.body.userName && req.body.name) {
      const device = req.body;
      Devices[device.name] = device;
      pubsub.publish(`/api/${device.userName}/devices/${req.method.toUpperCase()}`, device);
      res.status(200).send(device);
    } else {
      res.status(404).send({
        message: 'Wrong device schema',
      });
    }
  });

  app.get('/api/devices/:deviceName', (req, res) => {
    if (req.params.deviceName in Devices) {
      res.status(200).send(Devices[req.params.deviceName]);
    } else {
      res.status(404).send({
        message: 'Wrong device ID.',
      });
    }
  });

  app.put('/api/devices/:deviceName', (req, res) => {
    if (req.params.deviceName in Devices) {
      if (req.body.userName && req.body.name) {
        const device = req.body;
        delete Devices[req.params.deviceName];
        Devices[device.deviceName] = device;
        pubsub.publish(`/api/${device.userName}/devices/${req.method.toUpperCase()}`, device);
        res.status(200).send(device);
      } else {
        res.status(404).send({
          message: 'Wrong device schema',
        });
      }
    } else {
      res.status(404).send({
        message: 'Wrong device ID.',
      });
    }
  });

  return Promise.all([
    new Promise(resolve => {
      server = app.listen(HTTP_PORT, resolve as () => void);
    }),
  ]).then(() => {
    console.log(`Example HTTP API accessible on port ${HTTP_PORT}`);
  });
}

/**
 * Stops server.
 */
export function stopServers() {
  return Promise.all([server.close()]).then(() => {
    console.log(`Stopped HTTP API server`);
  });
}

// If run from command line, start server:
if (require.main === module) {
  startServers(3008).catch(console.error);
}
