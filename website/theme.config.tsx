/* eslint sort-keys: error */
import { addBasePath } from 'next/dist/client/add-base-path';
import { useRouter } from 'next/router';
import {
  Anchor,
  cn,
  defineConfig,
  Giscus,
  GitHubIcon,
  HiveFooter,
  HiveNavigation,
  MeshIcon,
  PaperIcon,
  PencilIcon,
  PRODUCTS,
  useTheme,
  VersionDropdown,
} from '@theguild/components';
import favicon from './public/favicon.svg';

export default defineConfig({
  websiteName: 'GraphQL Mesh',
  description: 'GraphQL Gateway Framework and anything-to-GraphQL',
  docsRepositoryBase: 'https://github.com/ardatan/graphql-mesh/tree/master/website',
  logo: PRODUCTS.MESH.logo,

  themeVersion: 'hive-rebranding',

  main: function Main({ children }) {
    const { resolvedTheme } = useTheme();
    const { route } = useRouter();

    const comments = route !== '/' && (
      <Giscus
        // ensure giscus is reloaded when client side route is changed
        key={route}
        repo="ardatan/graphql-mesh"
        repoId="MDEwOlJlcG9zaXRvcnkyMzM1OTc1MTc="
        category="Docs Discussions"
        categoryId="DIC_kwDODexqTc4CSDDQ"
        mapping="pathname"
        theme={resolvedTheme}
      />
    );

    return (
      <>
        {children}
        {comments}
      </>
    );
  },
  color: {
    hue: {
      dark: 67.1,
      light: 173,
    },
    saturation: {
      dark: 100,
      light: 40,
    },
  },
  navbar: {
    component: function NavigationMenu() {
      const { route } = useRouter();

      return (
        <HiveNavigation
          // we don't need that bg-green-200 doesn't occur on previous nor newer versions of Nextra,
          // so I'm just leaving it as is. we'll clean it up after we migrate
          className={route === '/' ? 'light max-w-[1392px] [&_kbd]:!bg-green-200' : 'max-w-[90rem]'}
          productName={PRODUCTS.MESH.name}
          navLinks={
            [
              // TODO: Saihaj mentioned Tutorials/Education
            ]
          }
          developerMenu={[
            {
              href: '/v1',
              icon: PaperIcon,
              children: 'Documentation',
            },
            {
              href: 'https://the-guild.dev/blog',
              icon: PencilIcon,
              children: 'Blog',
            },
            {
              href: 'https://github.com/ardatan/graphql-mesh',
              icon: GitHubIcon,
              children: 'GitHub',
            },
          ]}
          logo={
            <Anchor href="/" className="hive-focus -m-2 flex items-center gap-3 rounded-md p-2">
              <MeshIcon className="size-8" />
              <span className="text-2xl font-medium tracking-[-0.16px]">{PRODUCTS.MESH.name}</span>
            </Anchor>
          }
        >
          <VersionDropdown
            chevronPosition="right"
            currentVersion={route.includes('/docs') ? 'v0' : 'v1'}
            versions={[
              { label: 'Mesh v1 docs', href: addBasePath('/v1'), value: 'v1' },
              { label: 'Mesh v0 docs', href: addBasePath('/docs'), value: 'v0' },
            ]}
          />
        </HiveNavigation>
      );
    },
  },
  footer: {
    component: _props => {
      const { route } = useRouter();

      return (
        <HiveFooter
          className={cn(
            isLandingPage(route) ? 'light' : '[&>:first-child]:mx-0 [&>:first-child]:max-w-[90rem]',
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
              {
                children: 'Partners',
                href: '/partners',
                title: 'Partners',
              },
            ],
          }}
        />
      );
    },
  },
  head: () => {
    return (
      <>
        <link rel="icon" href={favicon.src} />
      </>
    );
  },
});

const landingLikePages = [
  '/',
  '/pricing',
  '/federation',
  '/oss-friends',
  '/ecosystem',
  '/partners',
];
const isLandingPage = (route: string) => landingLikePages.includes(route);
