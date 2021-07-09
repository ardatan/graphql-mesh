import React from 'react';
import { ThemeProvider, GlobalStyles, Header, FooterExtended } from '@theguild/components';

// Default implementation, that you can customize
function Root({ children }) {
  return (
    <ThemeProvider>
      <GlobalStyles includeFonts />
      <Header activeLink={'/open-source'} accentColor="var(--ifm-color-primary)" />
      {children}
      <FooterExtended />
    </ThemeProvider>
  );
}

export default Root;
