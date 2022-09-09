import { ReactElement } from 'react';
import dynamic from 'next/dynamic';
import { HeroGradient, FeatureList, NPMBadge } from '@theguild/components';
import GraphQLLogo from '../../public/assets/GraphQL_Logo.svg';
import MeshExampleLogo from '../../public/assets/mesh-example.png';
import OpenSourceLogo from '../../public/assets/open-source.svg';

export const LiveDemo = dynamic(() => import('../components/live-demo').then(mod => mod.LiveDemo), {
  ssr: false,
});

export function IndexPage(): ReactElement {
  return (
    <>
      <HeroGradient
        title="GraphQL Mesh"
        description="Query anything, run anywhere."
        link={{
          href: '/docs',
          children: 'View Docs',
          title: 'Get started with GraphQL Mesh',
        }}
        version={<NPMBadge name="@graphql-mesh/cli" />}
        colors={['#000', '#1cc8ee']}
      />

      <LiveDemo className="hidden lg:block mt-12" />

      <FeatureList
        items={[
          {
            title: 'GraphQL as a Query Language',
            description:
              'Use GraphQL as a query language to fetch data from your data-sources directly, without the need for a running gateway server, or any other bottleneck.',
            image: {
              src: GraphQLLogo,
              loading: 'eager',
              placeholder: 'empty',
              alt: 'GraphQL Logo',
            },
          },
          {
            title: 'Any Data Source',
            description:
              'Use GraphQL as a query language to fetch data from your data-sources directly, without the need for a running gateway server, or any other bottleneck.',
            image: {
              src: MeshExampleLogo,
              loading: 'eager',
              placeholder: 'empty',
              alt: 'GraphQL Mesh Logo',
            },
          },
          {
            title: 'Open Source',
            description:
              'GraphQL Mesh is free and open-source, and been built with the community. You can contribute, extend and have your custom logic easily.',
            image: {
              src: OpenSourceLogo,
              loading: 'eager',
              placeholder: 'empty',
              alt: 'Open Source Logo',
            },
          },
        ]}
      />
    </>
  );
}
