/* eslint-disable import/no-extraneous-dependencies */

/* eslint-disable import/no-nodejs-modules */
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
import { PubSub } from '@graphql-mesh/utils';
import { createRouter, Response } from '@whatwg-node/router';

export const exampleApi7 = createRouter({ base: '/api' });

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

exampleApi7.get('/user', () => {
  return new Response(JSON.stringify({ name: 'Arlene L McMahon' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi7.get('/devices', () => {
  return new Response(JSON.stringify(Object.values(Devices)), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi7.post('/devices', async req => {
  const device: any = await req.json();
  if (device.userName && device.name) {
    Devices[device.name] = device;
    pubsub.publish(
      `webhook:post:/api/${device.userName}/devices/${req.method.toUpperCase()}`,
      device,
    );
    return new Response(JSON.stringify(device), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } else {
    return new Response(JSON.stringify({ message: 'Wrong device schema' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});

exampleApi7.get('/devices/:deviceName', req => {
  if (req.params.deviceName in Devices) {
    return new Response(JSON.stringify(Devices[req.params.deviceName]), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } else {
    return new Response(JSON.stringify({ message: 'Wrong device ID.' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});

exampleApi7.put('/devices/:deviceName', async req => {
  if (req.params.deviceName in Devices) {
    const device: any = await req.json();
    if (device.userName && device.name) {
      delete Devices[req.params.deviceName];
      Devices[device.name] = device;
      pubsub.publish(
        `webhook:post:/api/${device.userName}/devices/${req.method.toUpperCase()}`,
        device,
      );
      return new Response(JSON.stringify(device), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(JSON.stringify({ message: 'Wrong device schema' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } else {
    return new Response(JSON.stringify({ message: 'Wrong device ID.' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});
