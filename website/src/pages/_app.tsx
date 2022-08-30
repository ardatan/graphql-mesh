import { ReactElement } from 'react';
import type { AppProps } from 'next/app';
import { FooterExtended, Header, ThemeProvider } from '@theguild/components';
import 'guild-docs/style.css';

export default function App({ Component, pageProps, router }: AppProps): ReactElement {
  // @ts-expect-error -- getLayout is custom function from nextra
  const { getLayout = page => page } = Component;

  return (
    <ThemeProvider>
      <Header accentColor="#1cc8ee" themeSwitch searchBarProps={{ version: 'v2' }} />
      {getLayout(<Component {...pageProps} />)}
      <FooterExtended />
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
