import Link from 'next/link';
import { Callout } from '@theguild/components';

function LegacyDocsBanner() {
  return (
    <Callout type="warning">
      This is the documentation for the <b>old</b> GraphQL Mesh version v0. We recommend upgrading
      to the latest GraphQL Mesh version v1.
      <br />
      <br />
      <Link
        href={`/v1/migration-from-v0`}
        className="_text-primary-600 _underline _decoration-from-font [text-underline-position:from-font]"
      >
        Migrate to GraphQL Mesh v1
      </Link>
    </Callout>
  );
}

export default {
  index: {
    title: 'Home',
    type: 'page',
    display: 'hidden',
    theme: {
      layout: 'raw',
    },
  },
  docs: {
    title: ' ',
    type: 'page',
    theme: {
      topContent: LegacyDocsBanner,
    },
  },
  examples: {
    title: 'Examples',
    type: 'page',
    theme: {
      layout: 'raw',
      footer: false,
    },
  },
  v1: {
    title: 'Docs',
    type: 'page',
    theme: {
      toc: true,
    },
  },
};
