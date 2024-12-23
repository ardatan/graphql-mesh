import { useMDXComponents as getDocsMDXComponents } from '@theguild/components/server';
import { docsMDXComponents } from './src/components/docs-mdx-components';

export const useMDXComponents = () => {
  return getDocsMDXComponents(docsMDXComponents);
};
