'use client';

import { usePathname } from 'next/navigation';
import { Callout } from '@theguild/components';
import { Link } from '../../../../components/docs-mdx-components';

export function LegacyDocsBanner() {
  const pathname = usePathname();
  if (pathname.startsWith('/v1')) {
    return null;
  }

  return (
    <Callout type="warning">
      This is the documentation for the <b>old</b> GraphQL Mesh version v0. We recommend upgrading
      to the latest GraphQL Mesh version v1.
      <br />
      <Link
        href="/v1/migration-from-v0"
        className="[*:has(div>&)]:mb-8 gap-2 underline hover:no-underline"
      >
        Migrate to GraphQL Mesh v1
      </Link>
    </Callout>
  );
}
