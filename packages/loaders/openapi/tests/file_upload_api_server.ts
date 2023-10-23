/* eslint-disable import/no-extraneous-dependencies */
import { createRouter, Response } from 'fets';

export const fileUploadApi = createRouter().route({
  method: 'POST',
  path: '/api/upload',
  async handler(req) {
    const formData = await req.formData();
    const file = formData?.get('file') as File;
    const name = file?.name;
    const content = await file?.text();
    return Response.json({ name, content });
  },
});
