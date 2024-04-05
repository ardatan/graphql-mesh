/* eslint-disable import/no-extraneous-dependencies */

// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
import { createRouter, Response } from 'fets';
import { PubSub } from '@graphql-mesh/utils';

export const pubsub = new PubSub();

const Devices: Record<string, { name: string; userName: string }> = {
  'Audio-player': {
    name: 'Audio-player',
    userName: 'johnny',
  },
  Drone: {
    name: 'Drone',
    userName: 'eric',
  },
};

export const exampleApi7 = createRouter({ base: '/api' })
  .route({
    method: 'GET',
    path: '/user',
    handler: () => Response.json({ name: 'Arlene L McMahon' }),
  })
  .route({
    method: 'GET',
    path: '/devices',
    handler: () => Response.json(Object.values(Devices)),
  })
  .route({
    method: 'POST',
    path: '/devices',
    async handler(req) {
      const device: any = await req.json();
      if (device.userName && device.name) {
        Devices[device.name] = device;
        pubsub.publish(
          `webhook:post:/api/${device.userName}/devices/${req.method.toUpperCase()}`,
          device,
        );
        return Response.json(device);
      } else {
        return Response.json({ message: 'Wrong device schema' }, { status: 404 });
      }
    },
  })
  .route({
    method: 'GET',
    path: '/devices/:deviceName',
    handler(req) {
      if (req.params.deviceName in Devices) {
        return Response.json(Devices[req.params.deviceName]);
      } else {
        return Response.json({ message: 'Wrong device ID.' }, { status: 404 });
      }
    },
  })
  .route({
    method: 'PUT',
    path: '/devices/:deviceName',
    async handler(req) {
      if (req.params.deviceName in Devices) {
        const device: any = await req.json();
        if (device.userName && device.name) {
          delete Devices[req.params.deviceName];
          Devices[device.name] = device;
          pubsub.publish(
            `webhook:post:/api/${device.userName}/devices/${req.method.toUpperCase()}`,
            device,
          );
          return Response.json(device);
          return new Response(JSON.stringify(device), {
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } else {
          return Response.json({ message: 'Wrong device schema' }, { status: 404 });
        }
      } else {
        return Response.json({ message: 'Wrong device ID.' }, { status: 404 });
      }
    },
  });
