import { execute } from './.mesh/index.mjs';

async function main() {
  const result = await execute(
    /* GraphQL */ `
      query fetchRecentEmails {
        me {
          displayName
          officeLocation
          messages(queryOptions: { top: 3 }) {
            subject
            isRead
            from {
              emailAddress {
                address
              }
            }
          }
        }
      }
    `,
    {},
    {
      accessToken: 'someAccessToken',
    }
  );
  console.log({
    result,
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
