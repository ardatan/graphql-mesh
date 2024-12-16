// eslint-disable-next-line import/no-extraneous-dependencies
import { Anchor } from 'nextra/components';
import { cn } from '@theguild/components';

export const Link: typeof Anchor = ({ className, ...props }) => {
  return (
    <Anchor
      // we remove `text-underline-position` from default Nextra link styles
      className={cn(
        'hive-focus dark:text-primary/90 dark:focus-visible:ring-primary/50 -mx-1 -my-0.5 rounded px-1 py-0.5 font-medium text-blue-700 underline underline-offset-[2px] hover:no-underline focus-visible:no-underline focus-visible:ring-current focus-visible:ring-offset-blue-200',
        className,
      )}
      {...props}
    />
  );
};

export const docsMDXComponents = {
  a: Link,
};
