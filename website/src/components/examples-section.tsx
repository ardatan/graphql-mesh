import { cn, Heading } from '@theguild/components';
import { ExamplesSandbox } from './examples-sandbox';

export interface ExamplesSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ExamplesSection(props: ExamplesSectionProps) {
  return (
    <div
      {...props}
      className={cn(
        'p-4 pt-12 sm:py-24 md:px-6 lg:px-12 2xl:px-24 md:pt-24 lg:py-20 flex flex-col items-center justify-center',
        props.className,
      )}
    >
      <Heading as="h3" size="md" className="text-center max-sm:text-3xl">
        See live examples in action
      </Heading>
      <ExamplesSandbox className="mt-4" lazy border />
    </div>
  );
}
