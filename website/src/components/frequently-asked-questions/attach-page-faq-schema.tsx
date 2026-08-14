'use client';

import { useEffect } from 'react';

export function AttachPageFAQSchema() {
  useEffect(() => {
    const html = document.querySelector('html');

    if (!html) {
      // This should never happen
      return;
    }

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
