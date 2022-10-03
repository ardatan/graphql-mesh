import { MeshLogo, defineConfig } from '@theguild/components';

const SITE_NAME = 'GraphQL Mesh';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/Urigo/graphql-mesh/tree/master/website',
  titleSuffix: ` – ${SITE_NAME}`,
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content={`${SITE_NAME}: documentation`} />
      <meta name="og:title" content={`${SITE_NAME}: documentation`} />
    </>
  ),
  logo: (
    <>
      <MeshLogo className="mr-1.5 h-9 w-9" />
      <div>
        <h1 className="md:text-md text-sm font-medium">{SITE_NAME}</h1>
        <h2 className="hidden text-xs sm:!block">Query anything, run anywhere</h2>
      </div>
    </>
  ),
});
