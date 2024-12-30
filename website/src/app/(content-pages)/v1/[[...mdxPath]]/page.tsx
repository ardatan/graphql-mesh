/* eslint-disable import/no-extraneous-dependencies */
import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { NextPageProps } from '@theguild/components';
import { useMDXComponents } from '../../../../../mdx-components.js';
import { ConfiguredGiscus } from '../../../../components/configured-giscus';

/**
 * You might have an urge to try to refactor this to a separate file and reuse between product-updates and docs.
 * I had the same urge. It's absurdly finicky. I warned you.
 *
 * BTW, even if we moved the product updates to page.mdx pattern, we still need this nesting to fix links in sidebar.
 */
export const generateStaticParams = async () => {
  const pages = await generateStaticParamsFor('mdxPath')();
  return pages
    .map(page => (page.mdxPath[0] === 'docs' ? { mdxPath: page.mdxPath.slice(1) } : null))
    .filter(Boolean);
};

export async function generateMetadata(props: NextPageProps<'...mdxPath'>) {
  const params = await props.params;
  const { metadata } = await importPage(['docs', ...(params.mdxPath || [])]);
  return metadata;
}

const Wrapper = useMDXComponents().wrapper;

export default async function Page(props: NextPageProps<'...mdxPath'>) {
  const params = await props.params;

  const result = await importPage(['docs', ...(params.mdxPath || [])]);
  const { default: MDXContent, toc, metadata } = result;

  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent params={params} />
      <ConfiguredGiscus />
    </Wrapper>
  );
}
