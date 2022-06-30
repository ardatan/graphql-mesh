import { getBuiltMesh } from '../.mesh';
import { createServer } from '@graphql-yoga/common';

async function handleRequest(request: Request, event: any) {
  try {
    const mesh = await getBuiltMesh();
    const server = createServer({
      plugins: mesh.plugins,
      maskedErrors: false,
      graphiql: {
        title: 'SpaceX Mesh',
      },
    });
    return server.handleRequest(request, event);
  } catch (e) {
    return new Response(e.stack, {
      status: 500,
    });
  }
}

self.addEventListener('fetch', (event: any) => {
  event.respondWith(handleRequest(event.request, event));
});
