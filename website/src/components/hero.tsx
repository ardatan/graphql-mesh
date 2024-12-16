import { cn } from '@theguild/components';

// TODO: Move these to `@theguild/components` and remove from here, Codegen and Hive.

export interface HeroContainerProps extends React.HTMLAttributes<HTMLDivElement> {}
export function HeroContainer(props: HeroContainerProps) {
  return (
    <div
      {...props}
      className={cn(
        'relative isolate flex max-w-[90rem] flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl bg-blue-400 px-4 py-6 sm:py-12 md:gap-8 lg:py-24',
        props.className,
      )}
    />
  );
}

export interface HeroLinksProps extends React.HTMLAttributes<HTMLDivElement> {}
export function HeroLinks(props: HeroLinksProps) {
  return (
    <div
      {...props}
      className={cn(
        'relative z-10 flex justify-center gap-2 px-0.5 max-sm:flex-col sm:gap-4',
        props.className,
      )}
    />
  );
}

export interface HeroFeaturesProps extends React.HTMLAttributes<HTMLUListElement> {}
export function HeroFeatures(props: HeroFeaturesProps) {
  return (
    <ul
      {...props}
      className={cn(
        'mx-auto flex list-none gap-x-6 gap-y-2 text-sm font-medium max-md:flex-col [&>li]:flex [&>li]:items-center [&>li]:gap-2',
        props.className,
      )}
    />
  );
}
