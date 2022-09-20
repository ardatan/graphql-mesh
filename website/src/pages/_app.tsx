import { ReactElement } from 'react';
import type { AppProps } from 'next/app';
import { FooterExtended, Header, ThemeProvider } from '@theguild/components';
import 'guild-docs/style.css';
import { ErrorBoundary } from '../components/error-boundries';

export default function App({ Component, pageProps }: AppProps): ReactElement {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Header accentColor="#1cc8ee" themeSwitch searchBarProps={{ version: 'v2' }} />
        <Component {...pageProps} />
        <FooterExtended />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

// const defaultSeo: AppSeoProps = {
//   title: 'GraphQL Mesh',
//   description: 'GraphQL Mesh Docs',
//   logo: {
//     url: 'https://the-guild-docs.vercel.app/assets/subheader-logo.png',
//     width: 50,
//     height: 54,
//   },
// };
