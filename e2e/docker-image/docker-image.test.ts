import { createTenv, type Container } from '@e2e/tenv';

const { container } = createTenv(__dirname);

let mesh!: Container;
beforeAll(async () => {
  const isCI = !!process.env.CI;
  const image = isCI ? 'ghcr.io/ardatan/graphql-mesh:test' : 'graphql-mesh-gateway';

  mesh = await container({
    name: 'graphql-mesh-test',
    image,
    containerPort: 4000,
    healthcheck: ['CMD-SHELL', 'wget --spider http://0.0.0.0:4000/healthcheck'],
    pipeLogs: true,
    skipImagePulling: true,
    volumes: [`${process.cwd()}/e2e/docker-image/mesh.config.ts:/app/mesh.config.ts:ro`],
  });
});

it('should pass health checks', async () => {
  const healthcheckResponse = await fetch(`http://0.0.0.0:${mesh.port}/healthcheck`);
  expect(healthcheckResponse.status).toBe(200);

  const readinessResponse = await fetch(`http://0.0.0.0:${mesh.port}/readiness`);
  expect(readinessResponse.status).toBe(200);
});
