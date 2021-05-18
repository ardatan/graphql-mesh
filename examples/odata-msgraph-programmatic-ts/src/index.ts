import { FetchRecentEmailsDocument } from './graphql-operations';
import { getMsGraphGraphQLClient } from './msGraphGraphQLClient';

async function main() {
  const client = await getMsGraphGraphQLClient();
  const result = await client.execute(
    FetchRecentEmailsDocument,
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
