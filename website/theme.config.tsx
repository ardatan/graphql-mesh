import { MeshLogo } from '@theguild/components';

const SITE_NAME = 'GraphQL Mesh';

export default {
  titleSuffix: ` – ${SITE_NAME}`,
  projectLink: 'https://github.com/urigo/graphql-mesh', // GitHub link in the navbar
  github: null,
  docsRepositoryBase: 'https://github.com/Urigo/graphql-mesh/tree/master/website', // base URL for the docs repository
  nextLinks: true,
  prevLinks: true,
  search: false,
  unstable_flexsearch: null,
  floatTOC: true,
  customSearch: null, // customizable, you can use algolia for example
  darkMode: true,
  footer: null,
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
};
