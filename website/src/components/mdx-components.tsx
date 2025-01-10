import { forwardRef } from 'react';
import { Anchor, cn } from '@theguild/components';

export const MDXLink = forwardRef<HTMLAnchorElement, React.LinkHTMLAttributes<HTMLAnchorElement>>(
  ({ className, href, children, ...rest }, ref) => {
    return (
      <Anchor
        ref={ref}
        // we remove `text-underline-position` from default Nextra link styles
        className={cn(
          'hive-focus dark:text-primary/90 dark:focus-visible:ring-primary/50 -mx-1 -my-0.5 rounded px-1 py-0.5 font-medium text-blue-700 underline underline-offset-2 hover:no-underline focus-visible:no-underline focus-visible:ring-current focus-visible:ring-offset-blue-200',
          className,
        )}
        href={href || ''}
        {...rest}
      >
        {children}
      </Anchor>
    );
  },
);
