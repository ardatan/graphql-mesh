import { FC } from 'react';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { appWithTranslation } from 'next-i18next';
import { extendTheme, LinkProps, theme as chakraTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import {
  AppSeoProps,
  CombinedThemeProvider,
  DocsPage,
  ExtendComponents,
  handlePushRoute,
  Link,
  useGoogleAnalytics,
} from '@guild-docs/client';
import { FooterExtended, Header, Subheader } from '@theguild/components';
import type { LinkProps as NextLinkProps } from 'next/link';
import { ExternalLinkIcon } from '@chakra-ui/icons';

import '@algolia/autocomplete-theme-classic';
import '@theguild/components/dist/static/css/SearchBarV2.css';

import '../../public/style.css';

const LinkNewTabIfExternal = (props: LinkProps & NextLinkProps) => {
  return props.href.startsWith('/') ? (
    // @ts-expect-error type incompatibility
    <Link {...props} color="accentColor" sx={{ '&:hover': { textDecoration: 'none' } }} />
  ) : (
    <>
      {/* @ts-expect-error type incompatibility */}
      <Link {...props} isExternal={true} color="accentColor" sx={{ '&:hover': { textDecoration: 'none' } }} />{' '}
      <ExternalLinkIcon />
    </>
  );
};

ExtendComponents({
  HelloWorld() {
    return <p>Hello World!</p>;
  },
  Link: LinkNewTabIfExternal,
  a: LinkNewTabIfExternal,
});

const styles: typeof chakraTheme['styles'] = {
  global: props => ({
    body: {
      bg: mode('white', 'gray.850')(props),
    },
  }),
};

const accentColor = '#1cc8ee';

const theme = extendTheme({
  colors: {
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      850: '#1b1b1b',
      900: '#171717',
    },
    accentColor,
  },
  fonts: {
    heading: 'TGCFont, sans-serif',
    body: 'TGCFont, sans-serif',
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles,
});

const serializedMdx = process.env.SERIALIZED_MDX_ROUTES;
const mdxRoutes = { data: serializedMdx && JSON.parse(serializedMdx) };

const AppContent: FC<AppProps> = appProps => {
  const { Component, pageProps, router } = appProps;
  const analytics = useGoogleAnalytics({ router, trackingId: 'G-TPQZLLF5T5' });
  const isDocs = router.asPath.startsWith('/docs');

  return (
    <>
      <Header accentColor={accentColor} activeLink="/open-source" themeSwitch searchBarProps={{ version: 'v2' }} />
      <Subheader
        activeLink={router.asPath}
        product={{
          title: 'GraphQL Mesh',
          description: 'Query anything, run anywhere.',
          image: {
            src: '/assets/subheader-logo.svg',
            alt: 'GraphQL Mesh',
          },
          onClick: e => handlePushRoute('/', e),
        }}
        links={[
          {
            children: 'Home',
            title: 'Read about GraphQL Mesh',
            href: '/',
            onClick: e => handlePushRoute('/', e),
          },
          {
            children: 'Docs',
            title: 'View examples',
            href: '/docs/introduction',
            onClick: e => handlePushRoute('/docs/introduction', e),
          },
          {
            children: 'GitHub',
            href: 'https://github.com/urigo/graphql-mesh',
            target: '_blank',
            rel: 'noopener norefereer',
            title: "Head to the project's GitHub",
          },
        ]}
        cta={{
          children: 'Contact Us',
          title: 'Start using The Guild Docs',
          href: 'https://the-guild.dev/contact',
          target: '_blank',
          rel: 'noopener noreferrer',
        }}
      />
      <Script {...analytics.loadScriptProps} />
      <Script {...analytics.configScriptProps} />
      {isDocs ? (
        <DocsPage appProps={appProps} accentColor={accentColor} mdxRoutes={mdxRoutes} />
      ) : (
        <Component {...pageProps} />
      )}
      <FooterExtended />
    </>
  );
};

const AppContentWrapper = appWithTranslation(function TranslatedApp(appProps) {
  return <AppContent {...appProps} />;
});

const defaultSeo: AppSeoProps = {
  title: 'GraphQL Mesh',
  description: 'GraphQL Mesh Docs',
  logo: {
    url: 'https://the-guild-docs.vercel.app/assets/subheader-logo.png',
    width: 50,
    height: 54,
  },
};

const App: FC<AppProps> = appProps => {
  return (
    <CombinedThemeProvider theme={theme} accentColor={accentColor} defaultSeo={defaultSeo}>
      <AppContentWrapper {...appProps} />
    </CombinedThemeProvider>
  );
};

export default App;
