import { useState } from 'react';
import dynamic from 'next/dynamic';
import { HeroGradient, InfoList } from '@theguild/components';
import { handlePushRoute, NPMBadge } from '@guild-docs/client';
import styles from './styles.module.css';

const LiveDemo = dynamic(() => import('../components/live-demo'), {
  loading: () => <p>Loading...</p>,
});

export default function Index() {
  // Todo: Add button to toggle liveDemo
  const [showLiveDemo, setShowLiveDemo] = useState(true);
  return (
    <>
      <HeroGradient
        title="GraphQL Mesh"
        description="Query anything, run anywhere."
        link={{
          href: '/docs',
          children: 'View Docs',
          title: 'Get started with GraphQL Mesh',
          onClick: e => handlePushRoute('/docs', e),
        }}
        version={<NPMBadge name="@graphql-mesh/cli" />}
        colors={['#000', '#1cc8ee']}
      />
      {/* <FeatureList
        title=""
        items={[
          {
            title: 'GraphQL as a Query Language',
            description:
              'Use GraphQL as a query language to fetch data from your data-sources directly, without the need for a running gateway server, or any other bottleneck.',
            image: {
              src: '/assets/GraphQL_Logo.svg',
              alt: 'Illustration',
            },
          },
          {
            title: 'Any Data Source',
            description:
              "With GraphQL Mesh, you can use GraphQL query language to fetch from (almost) any data source, without changing the source or modify it's code.",
            image: {
              src: '/assets/mesh-example.png',
              alt: 'Illustration',
            },
          },
          {
            title: 'Open Source',
            description:
              'GraphQL Mesh is free and open-source, and been built with the community. You can contribute, extend and have your custom logic easily.',
            image: {
              src: '/assets/open-source.svg',
              alt: 'more',
            },
          },
        ]}
      /> */}

      {showLiveDemo && (
        <div className={styles.liveDemo}>
          <a id="live-demo" />
          <LiveDemo />
        </div>
      )}

      <InfoList
        title=""
        items={[
          {
            title: 'GraphQL as a Query Language',
            description: `Use GraphQL as a query language to fetch data from your data-sources directly, without the need for a running gateway server, or any other bottleneck.`,
          },
          {
            title: 'Any Data Source',
            description: `With GraphQL Mesh, you can use GraphQL query language to fetch from (almost) any data source, without changing the source or modify it's code.`,
          },
          {
            title: 'Open Source',
            description: `GraphQL Mesh is free and open-source, and been built with the community. You can contribute, extend and have your custom logic easily.`,
          },
        ]}
      />
    </>
  );
}
