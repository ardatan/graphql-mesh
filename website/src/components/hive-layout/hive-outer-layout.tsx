import { ReactNode } from 'react';
import { NextFont } from 'next/dist/compiled/@next/font';
import { Head } from 'nextra/components';

export interface HiveOuterLayoutProps {
  children: ReactNode;
  font: NextFont;
}

// We'll promote this to Components if the reviewers (probably Dima) like the idea.
export function HiveOuterLayout({ children, font }: HiveOuterLayoutProps) {
  return (
    <html
      lang="en"
      // Required to be set for `nextra-theme-docs` styles
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
      className="font-sans"
    >
      <Head>
        <style>{`:root { --font-sans: ${font.style.fontFamily}; }`}</style>
        <HiveGlobalLayoutStyles />
      </Head>
      <body>{children}</body>
    </html>
  );
}
/**
 * This should probably be moved to @theguild/components style.css file, but in such a way that it's
 * not breaking to websites not using Hive Layout yet.
 */
function HiveGlobalLayoutStyles() {
  return (
    <style>{
      /* css */ `
        :root.dark {
          --nextra-primary-hue: 67.1deg;
          --nextra-primary-saturation: 100%;
          --nextra-primary-lightness: 55%;
          --nextra-bg: 17, 17, 17;
        }
        :root.dark *::selection {
          background-color: hsl(191deg 95% 72% / 0.25)
        }
        .light *::selection {
          background-color: rgb(134 182 193 / 0.2);
        }
        :root.light, body.light {
          --nextra-primary-hue: 191deg;
          --nextra-primary-saturation: 40%;
          --nextra-bg: 255, 255, 255;
        }
        .x\\:tracking-tight,
        .nextra-steps :is(h2, h3, h4) {
          letter-spacing: normal;
        }
      `
    }</style>
  );
}
