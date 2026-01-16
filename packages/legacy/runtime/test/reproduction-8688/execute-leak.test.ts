import path from 'path';
import { processConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import { startService } from './sourceService';

it('should not leak the memory with mesh.execute', async () => {
  await using _service = await startService();
  const configuredMesh = await processConfig(
    {
      sources: [
        {
          name: 'Hello World',
          handler: {
            openapi: {
              endpoint: 'http://localhost:3000',
              source: path.join(__dirname, './schema.yml'),
            },
          },
        },

        // Not using this service, but we add it
        // because the leak is more prominent with multiple services
        {
          name: 'Some Other Service',
          handler: {
            openapi: {
              source: path.join(__dirname, './some-other-service.yaml'),
              endpoint: 'http://localhost:5000',
            },
          },
        },
      ],
    },
    {
      dir: __dirname,
      initialLoggerPrefix: '🕸️  Mesh',
      artifactsDir: '.mesh',
      additionalPackagePrefixes: [],
    },
  );

  await using mesh = await getMesh(configuredMesh);

  const iterations = 100;

  for (let i = 0; i < 10; i++) {
    const results = await mesh.execute(
      /* GraphQL */ `
        query UserProfile {
          api_data {
            id
            name
            age
            isActive
            profile {
              bio
              location
              social {
                twitter
                linkedin
                github
              }
              preferences {
                theme
                language
                timezone
                notifications
              }
            }
            posts {
              postId
              title
              content
              author
              tags
              likes
              comments
              views
              isPublished
              category
              readTime
              featured
            }
            followers {
              followerId
              name
              isMutual
              status
              bio
              location
              socialLinks {
                twitter
                linkedin
                github
              }
              interests
              postsCount
              followersCount
              followingCount
              verified
              premium
            }
            following {
              followingId
              name
              isMutual
              status
              bio
              location
              socialLinks {
                twitter
                linkedin
                github
              }
              interests
              postsCount
              followersCount
              followingCount
              verified
              premium
            }
          }
        }
      `,
      undefined,
    );

    expect(results.data.api_data.length).toBeGreaterThan(0);
  }
}, 60_000);
