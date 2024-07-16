import { createTenv } from '@e2e/tenv';

const { container, spawn } = createTenv(__dirname);

it('should build, start and pass healthchecks', async () => {
  // const [, waitForBundle] = await spawn('yarn workspace @graphql-mesh/serve-cli bundle', {
  //   pipeLogs: true,
  // });
  // await waitForBundle;

  // SUGGESTION: bake project first so that the tests dont time out during build phase

  const { port } = await container({
    pipeLogs: true,
    name: 'serve-cli-e2e-docker-image',
    image: 'ghcr.io/ardatan/mesh-serve',
    containerPort: 4000,
    healthcheck: ['CMD-SHELL', 'wget --spider http://0.0.0.0:4000/healthcheck'],
    volumes: [
      {
        host: 'mesh.config.ts',
        container: '/serve/mesh.config.ts',
      },
    ],
  });

  const healthcheckResponse = await fetch(`http://0.0.0.0:${port}/healthcheck`);
  expect(healthcheckResponse.status).toBe(200);

  const readinessResponse = await fetch(`http://0.0.0.0:${port}/readiness`);
  expect(readinessResponse.status).toBe(200);
});
