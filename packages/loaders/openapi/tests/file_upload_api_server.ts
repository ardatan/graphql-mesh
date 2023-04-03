/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
import { createRouter, Response } from '@whatwg-node/router';

export const fileUploadApi = createRouter();

fileUploadApi.post('/api/upload', async (req, res) => {
  const formData = await req.formData();
  const file = formData?.get('file') as File;
  const name = file?.name;
  const content = await file?.text();
  return new Response(JSON.stringify({ name, content }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});
