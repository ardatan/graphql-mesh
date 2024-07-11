import { createTenv } from '@e2e/tenv';

const { container } = createTenv(__dirname);

it('should build, start and pass healthchecks', async () => {
  const { port } = await container({
    name: 'serve-cli-e2e-docker-image',
    image: 'serve-cli',
    containerPort: 4000,
    healthcheck: ['CMD-SHELL', 'wget --spider http://0.0.0.0:4000/healthcheck'],
    volumes: [
      {
        host: 'mesh.config.ts',
        container: '/app/mesh.config.ts',
      },
    ],
  });

  const healthcheckResponse = await fetch(`http://0.0.0.0:${port}/healthcheck`);
  expect(healthcheckResponse.status).toBe(200);

  const readinessResponse = await fetch(`http://0.0.0.0:${port}/readiness`);
  expect(readinessResponse.status).toBe(200);
});
