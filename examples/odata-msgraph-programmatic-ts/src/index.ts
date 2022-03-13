import { getBuiltMesh, fetchRecentEmailsDocument } from '../.mesh';

async function main() {
  const { execute } = await getBuiltMesh();
  const result = await execute(
    fetchRecentEmailsDocument,
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
