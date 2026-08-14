declare module '*.mdx' {
  import type { ComponentType } from 'react';

  const MDXComponent: ComponentType<{
    components?: Record<string, ComponentType<any>>;
  }>;

  export default MDXComponent;
}
