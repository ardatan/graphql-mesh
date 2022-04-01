import Document, { Head, Html, Main, NextScript } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';
import { Partytown } from '@builder.io/partytown/react';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet" />
          <Partytown debug={true} forward={['dataLayer.push']} />
        </Head>
        <body>
          <ColorModeScript initialColorMode="light" />
          <Main />
          <NextScript />
          <script async src="https://the-guild.dev/static/crisp.js" type="text/partytown" />
        </body>
      </Html>
    );
  }
}
