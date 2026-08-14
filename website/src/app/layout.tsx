import type { FC, ReactNode } from 'react';
import localFont from 'next/font/local';
import {
  Anchor,
  GitHubIcon,
  HiveFooter,
  HiveNavigation,
  MeshIcon,
  PaperIcon,
  PencilIcon,
  PRODUCTS,
} from '@theguild/components';
import { HiveLayout } from '@theguild/components/server';
import '@theguild/components/style.css';
import { rootMetadata, websiteDescription } from './metadata';
import { VersionDropdown } from './version-dropdown.client';
import './global.css';
import type { Metadata } from 'next';

export const metadata: Metadata = rootMetadata;

const neueMontreal = localFont({
  src: [
    { path: '../fonts/PPNeueMontreal-Regular.woff2', weight: '400' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '500' },
  ],
});

const RootLayout: FC<{
  children: ReactNode;
}> = async ({ children }) => {
  return (
    <HiveLayout
      className="[&>.light_#h-navmenu-container]:max-w-[1392px]"
      fontFamily={neueMontreal.style.fontFamily}
      docsRepositoryBase="https://github.com/ardatan/graphql-mesh/tree/master/website"
      head={null}
      lightOnlyPages={['/', '/examples']}
      navbar={
        <HiveNavigation
          productName={PRODUCTS.MESH.name}
          logo={
            <Anchor href="/" className="hive-focus -m-2 flex items-center gap-3 rounded-md p-2">
              <MeshIcon className="size-8" />
              <span className="text-2xl font-medium tracking-[-0.16px]">{PRODUCTS.MESH.name}</span>
            </Anchor>
          }
          navLinks={[]}
          developerMenu={[
            {
              href: '/v1',
              icon: <PaperIcon />,
              children: 'Documentation',
            },
            {
              href: 'https://the-guild.dev/graphql/hive/blog',
              icon: <PencilIcon />,
              children: 'Blog',
            },
            {
              href: 'https://github.com/ardatan/graphql-mesh',
              icon: <GitHubIcon />,
              children: 'GitHub',
            },
          ]}
        >
          <VersionDropdown />
        </HiveNavigation>
      }
      footer={
        <HiveFooter
          logo={
            <div className="flex items-center gap-3">
              <MeshIcon className="size-8" />
              <span className="text-2xl font-medium tracking-[-0.16px]">{PRODUCTS.MESH.name}</span>
            </div>
          }
          description={websiteDescription}
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
              {
                children: 'Partners',
                href: '/partners',
                title: 'Partners',
              },
            ],
          }}
        />
      }
    >
      {children}
    </HiveLayout>
  );
};

export default RootLayout;
