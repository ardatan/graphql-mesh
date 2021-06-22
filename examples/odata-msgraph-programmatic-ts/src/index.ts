import { getBuiltMesh } from '../.mesh';
import { FetchRecentEmailsDocument } from './graphql-operations';

async function main() {
  const client = await getBuiltMesh();
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
