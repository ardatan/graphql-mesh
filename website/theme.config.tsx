/* eslint sort-keys: error */
import { useRouter } from 'next/router';
import { defineConfig, Giscus, PRODUCTS, useConfig, useTheme } from '@theguild/components';
import { ProductUpdateBlogPostHeader } from './src/components/product-update-blog-post-header';

export default defineConfig({
  description: 'GraphQL Gateway Framework and anything-to-GraphQL',
  docsRepositoryBase: 'https://github.com/Urigo/graphql-mesh/tree/master/website',
  logo: PRODUCTS.MESH.logo({ className: 'w-8' }),
  main: function Main({ children }) {
    const { resolvedTheme } = useTheme();
    const { route } = useRouter();
    const config = useConfig();

    if (route === '/product-updates') {
      return <>{children}</>;
    }

    if (route.startsWith('/product-updates')) {
      children = (
        <>
          <ProductUpdateBlogPostHeader meta={config.frontMatter as any} />
          {children}
        </>
      );
    }

    const comments = route !== '/' && (
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

    return (
      <>
        {children}
        {comments}
      </>
    );
  },
  websiteName: 'GraphQL-Mesh',
});
