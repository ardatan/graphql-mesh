'use client';

import { useEffect } from 'react';

export function AttachPageFAQSchema() {
  useEffect(() => {
    const html = document.querySelector('html');

    if (!html) {
      // This should never happen
      return;
    }

    const path = window.location.pathname.replace('/graphql/hive', '/');

    if (!html.hasAttribute('itemscope')) {
      html.setAttribute('itemscope', '');
      html.setAttribute('itemtype', 'https://schema.org/FAQPage');

      return () => {
        html.removeAttribute('itemscope');
        html.removeAttribute('itemtype');
      };
    }
  }, []);

  return null;
}
