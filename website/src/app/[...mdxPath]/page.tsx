import { Anchor, Callout, type NextPageProps } from '@theguild/components';
import { generateStaticParamsFor, importPage } from '@theguild/components/pages';
import { useMDXComponents } from '../../mdx-components';
import { Giscus } from '../giscus';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

export async function generateMetadata(props: NextPageProps<'...mdxPath'>) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath);
  return metadata;
}

const Wrapper = useMDXComponents().wrapper;

function LegacyDocsBanner() {
  return (
    <Callout type="warning">
      This is the documentation for the <b>old</b> GraphQL Mesh version v0. We recommend upgrading
      to the latest GraphQL Mesh version v1.
      <br />
      <br />
      <Anchor href="/v1/migration-from-v0">Migrate to GraphQL Mesh v1</Anchor>
    </Callout>
  );
}

export default async function Page(props: NextPageProps<'...mdxPath'>) {
  const params = await props.params;
  const result = await importPage(params.mdxPath);
  const { default: MDXContent, toc, metadata } = result;
  const isLegacyDocs = params.mdxPath?.[0] === 'docs';

  return (
    <Wrapper toc={toc} metadata={metadata} bottomContent={<Giscus />}>
      {isLegacyDocs ? <LegacyDocsBanner /> : null}
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
