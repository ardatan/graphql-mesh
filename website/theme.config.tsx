/* eslint-disable react-hooks/rules-of-hooks */
/* eslint sort-keys: error */

import { defineConfig, Giscus, MeshLogo, useTheme } from '@theguild/components';
import { useRouter } from 'next/router';

const SITE_NAME = 'GraphQL Mesh';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/Urigo/graphql-mesh/tree/master/website',
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
        <h2 className="hidden text-xs sm:block">Query anything, run anywhere</h2>
      </div>
    </>
  ),
  main: {
    extraContent() {
      const { resolvedTheme } = useTheme();
      const { route } = useRouter();

      if (route === '/') {
        return null;
      }
      return (
        <Giscus
          // ensure giscus is reloaded when client side route is changed
          key={route}
          repo="Urigo/graphql-mesh"
          repoId="MDEwOlJlcG9zaXRvcnkyMzM1OTc1MTc="
          category="Docs Discussions"
          categoryId="DIC_kwDODexqTc4CSDDQ"
          mapping="pathname"
          theme={resolvedTheme}
        />
      );
    },
  },
  titleSuffix: ` – ${SITE_NAME}`,
});
