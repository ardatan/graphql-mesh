import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { DocsContent, DocsTOC, MDXPage, EditOnGitHubButton } from '@guild-docs/client';
import { MDXPaths, MDXProps } from '@guild-docs/server';
import { getRoutes } from '../../../routes';

export default MDXPage(({ content, TOC, MetaHead, frontMatter, sourceFilePath }) => {
  return (
    <>
      <Head>{MetaHead}</Head>
      <DocsContent className={frontMatter.fullWidth ? 'fullWidth' : ''}>{content}</DocsContent>
      {!frontMatter.fullWidth && (
        <DocsTOC>
          <TOC />
          <EditOnGitHubButton
            baseDir="website"
            branch="master"
            sourceFilePath={sourceFilePath}
            repo="urigo/graphql-mesh"
          />
        </DocsTOC>
      )}
    </>
  );
});

export const getStaticProps: GetStaticProps = ctx => {
  return MDXProps(
    ({ readMarkdownFile, getArrayParam }) =>
      readMarkdownFile('docs/', getArrayParam('slug'), { importPartialMarkdown: true }),
    ctx,
    { getRoutes }
  );
};

export const getStaticPaths: GetStaticPaths = ctx => MDXPaths('docs', { ctx });
