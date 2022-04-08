import Document, { Head, Html, Main, NextScript } from 'next/document';
import Script from 'next/script';
import { ColorModeScript } from '@chakra-ui/react';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet" />
        </Head>
        <body>
          <ColorModeScript initialColorMode="light" />
          <Main />
          <NextScript />
          <Script src="https://the-guild.dev/static/crisp.js" strategy="worker" />
        </body>
      </Html>
    );
  }
}
