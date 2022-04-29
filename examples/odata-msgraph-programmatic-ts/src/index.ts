import { execute, fetchRecentEmailsDocument } from '../.mesh';

async function main() {
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
