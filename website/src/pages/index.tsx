/* eslint-disable @typescript-eslint/ban-ts-comment */
import { FC } from 'react';
import dynamic from 'next/dynamic';
import { HeroGradient, InfoList } from '@theguild/components';
import { handlePushRoute, NPMBadge } from '@guild-docs/client';
import { Heading, HStack } from '@chakra-ui/react';
import Image from 'next/image';
import tw from 'twin.macro';
import GraphQLLogo from '../../public/assets/GraphQL_Logo.svg';
import MeshExampleLogo from '../../public/assets/mesh-example.png';
import OpenSourceLogo from '../../public/assets/open-source.svg';

const LiveDemo = dynamic(() => import('../components/live-demo'), {
  loading: () => <p>Loading...</p>,
});

const FeatureTitle: FC<{ imgSrc: string; title: string }> = ({ imgSrc, title }) => {
  return (
    <>
      <HStack>
        <Image src={imgSrc} width="120px" height="120px" alt={title} />
      </HStack>
      <br />
      <HStack>
        <Heading fontSize="1em">{title}</Heading>
      </HStack>
    </>
  );
};

export default function Index() {
  return (
    <>
      <HeroGradient
        title="GraphQL Mesh"
        description="Query anything, run anywhere."
        link={{
          href: '/docs/introduction',
          children: 'View Docs',
          title: 'Get started with GraphQL Mesh',
          onClick: e => handlePushRoute('/docs/introduction', e),
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
      {/* @ts-ignore */}
      <div css={[tw`hidden lg:block px-8 py-12`]}>
        <LiveDemo />
      </div>

      <InfoList
        title=""
        items={[
          {
            title: <FeatureTitle title="GraphQL as a Query Language" imgSrc={GraphQLLogo} />,
            description: `Use GraphQL as a query language to fetch data from your data-sources directly, without the need for a running gateway server, or any other bottleneck.`,
          },
          {
            title: <FeatureTitle title="Any Data Source" imgSrc={MeshExampleLogo as any} />,
            description: `With GraphQL Mesh, you can use GraphQL query language to fetch from (almost) any data source, without changing the source or modify it's code.`,
          },
          {
            title: <FeatureTitle title="Open Source" imgSrc={OpenSourceLogo} />,
            description: `GraphQL Mesh is free and open-source, and been built with the community. You can contribute, extend and have your custom logic easily.`,
          },
        ]}
      />
    </>
  );
}
