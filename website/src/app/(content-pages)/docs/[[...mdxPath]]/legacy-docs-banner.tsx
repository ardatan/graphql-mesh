import Link from 'next/link';
import { Anchor, Callout } from '@theguild/components';

export function LegacyDocsBanner() {
  return (
    <Callout type="warning">
      This is the documentation for the <b>old</b> GraphQL Mesh version v0. We recommend upgrading
      to the latest GraphQL Mesh version v1.
      <Anchor href="/v1/migration-from-v0" className="block">
        Migrate to GraphQL Mesh v1
      </Anchor>
    </Callout>
  );
}
