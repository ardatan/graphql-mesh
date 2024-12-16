import { ReactNode } from 'react';
import { Layout as NextraLayout } from 'nextra-theme-docs';
import {
  cn,
  GitHubIcon,
  GraphQLConfCard,
  HiveFooter,
  HiveNavigation,
  HiveNavigationProps,
  PaperIcon,
  PencilIcon,
  PRODUCTS,
  RightCornerIcon,
  TargetIcon,
} from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import graphQLConfLocalImage from './graphql-conf-image.webp';

const developerMenu: HiveNavigationProps['developerMenu'] = [
  {
    href: '/docs',
    icon: <PaperIcon />,
    children: 'Documentation',
  },
  { href: 'https://status.graphql-hive.com/', icon: <TargetIcon />, children: 'Status' },
  {
    href: '/product-updates',
    icon: <RightCornerIcon />,
    children: 'Product Updates',
  },
  { href: 'https://the-guild.dev/blog', icon: <PencilIcon />, children: 'Blog' },
  {
    href: 'https://github.com/graphql-hive/console',
    icon: <GitHubIcon />,
    children: 'GitHub',
  },
];

export async function HiveInnerLayout({
  children,
  isLanding,
}: {
  children: ReactNode;
  /**
   * Landing pages are 48px narrower than the docs pages and they only have light mode.
   */
  isLanding: boolean;
}) {
  const [meta, ...pageMap] = await getPageMap();

  // const productsPage = pageMap.find(p => 'name' in p && p.name === 'products')!;
  // // @ts-expect-error -- this should be fixed in Nextra, without route, the collapsible doesn't work
  // productsPage.route = '#';

  return (
    <NextraLayout
      editLink="Edit this page on GitHub"
      docsRepositoryBase="https://github.com/graphql-hive/platform/tree/main/packages/web/docs"
      pageMap={[
        {
          data: {
            // @ts-expect-error -- fixme (copied from Dima's v8 PR (sorry))
            ...meta.data,
          },
        },
        ...pageMap,
      ]}
      feedback={{ labels: 'kind/docs' }}
      navbar={
        <HiveNavigation
          className={isLanding ? 'light max-w-[1392px]' : 'max-w-[90rem]'}
          companyMenuChildren={<GraphQLConfCard image={graphQLConfLocalImage} />}
          productName={PRODUCTS.HIVE.name}
          developerMenu={developerMenu}
        />
      }
      sidebar={{ defaultMenuCollapseLevel: 1 }}
      footer={
        <HiveFooter
          className={cn(
            isLanding ? 'light' : '[&>:first-child]:mx-0 [&>:first-child]:max-w-[90rem]',
            'pt-[72px]',
          )}
          items={{
            resources: [
              {
                children: 'Privacy Policy',
                href: 'https://the-guild.dev/graphql/hive/privacy-policy.pdf',
                title: 'Privacy Policy',
              },
              {
                children: 'Terms of Use',
                href: 'https://the-guild.dev/graphql/hive/terms-of-use.pdf',
                title: 'Terms of Use',
              },
            ],
          }}
        />
      }
    >
      {children}
    </NextraLayout>
  );
}
