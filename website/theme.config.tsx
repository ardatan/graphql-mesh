import { MeshLogo } from '@theguild/components';
import { DocsThemeConfig } from 'nextra-theme-docs';

const SITE_NAME = 'GraphQL Mesh';

const config: DocsThemeConfig = {
  titleSuffix: ` – ${SITE_NAME}`,
  projectLink: 'https://github.com/urigo/graphql-mesh', // GitHub link in the navbar
  docsRepositoryBase: 'https://github.com/Urigo/graphql-mesh/tree/master/website/src/pages', // base URL for the docs repository
  nextLinks: true,
  prevLinks: true,
  search: true,
  unstable_flexsearch: true,
  floatTOC: true,
  darkMode: true,
  footer: false,
  footerEditLink: 'Edit this page on GitHub',
  logo: (
    <>
      <MeshLogo className="mr-1.5 h-9 w-9" />
      <div>
        <h1 className="md:text-md text-sm font-medium">{SITE_NAME}</h1>
        <h2 className="hidden text-xs sm:!block">Query anything, run anywhere</h2>
      </div>
    </>
  ),
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content={`${SITE_NAME}: documentation`} />
      <meta name="og:title" content={`${SITE_NAME}: documentation`} />
    </>
  ),
  gitTimestamp: 'Last updated on',
  defaultMenuCollapsed: true,
  feedbackLink: 'Question? Give us feedback →',
  feedbackLabels: 'kind/docs',
};

export default config;
