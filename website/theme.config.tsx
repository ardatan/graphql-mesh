/* eslint sort-keys: error */
import { useRouter } from 'next/router';
import { defineConfig, Giscus, PRODUCTS, useTheme } from '@theguild/components';

export default defineConfig({
  description: 'GraphQL Gateway Framework and anything-to-GraphQL',
  docsRepositoryBase: 'https://github.com/ardatan/graphql-mesh/tree/master/website',
  // @ts-expect-error - Typings are not updated
  logo: PRODUCTS.MESH.logo({ className: 'w-8' }),
  main: function Main({ children }) {
    const { resolvedTheme } = useTheme();
    const { route } = useRouter();

    const comments = route !== '/' && (
      <Giscus
        // ensure giscus is reloaded when client side route is changed
        key={route}
        repo="ardatan/graphql-mesh"
        repoId="MDEwOlJlcG9zaXRvcnkyMzM1OTc1MTc="
        category="Docs Discussions"
        categoryId="DIC_kwDODexqTc4CSDDQ"
        mapping="pathname"
        theme={resolvedTheme}
      />
    );

    return (
      <>
        {children}
        {comments}
      </>
    );
  },
  websiteName: 'GraphQL-Mesh',
});
