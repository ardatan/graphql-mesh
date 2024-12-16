'use client';

import { usePathname } from 'next/navigation';
import { Giscus } from '@theguild/components';

export function ConfiguredGiscus() {
  const route = usePathname();

  return (
    <Giscus
      // ensure giscus is reloaded when client side route is changed
      key={route}
      repo="ardatan/graphql-mesh"
      repoId="MDEwOlJlcG9zaXRvcnkyMzM1OTc1MTc="
      category="Docs Discussions"
      categoryId="DIC_kwDODexqTc4CSDDQ"
      mapping="pathname"
    />
  );
}
