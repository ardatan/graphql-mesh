import { ReactElement } from 'react';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { AppSeoProps, useGoogleAnalytics } from '@guild-docs/client';
import { FooterExtended, Header, ThemeProvider } from '@theguild/components';

import 'nextra-theme-docs/style.css';
import '../../public/style.css';
import '@algolia/autocomplete-theme-classic';
import '@theguild/components/dist/static/css/SearchBarV2.css';

const accentColor = '#1cc8ee';

export default function App({ Component, pageProps, router }: AppProps): ReactElement {
  const analytics = useGoogleAnalytics({ router, trackingId: 'G-TPQZLLF5T5' });
  // @ts-expect-error
  const { getLayout } = Component;
  const childComponent = <Component {...pageProps} />;

  return (
    <ThemeProvider>
      <Header accentColor={accentColor} themeSwitch searchBarProps={{ version: 'v2' }} />
      <Script {...analytics.loadScriptProps} />
      <Script {...analytics.configScriptProps} />
      <Script src="https://the-guild.dev/static/crisp.js" />
      {getLayout ? getLayout(childComponent) : childComponent}
      <FooterExtended />
    </ThemeProvider>
  );
}

const defaultSeo: AppSeoProps = {
  title: 'GraphQL Mesh',
  description: 'GraphQL Mesh Docs',
  logo: {
    url: 'https://the-guild-docs.vercel.app/assets/subheader-logo.png',
    width: 50,
    height: 54,
  },
};
