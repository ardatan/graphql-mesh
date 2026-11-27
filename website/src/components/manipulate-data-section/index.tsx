import Image from 'next/image';
import { Anchor, cn, DecorationIsolation, Heading } from '@theguild/components';
import manipulateSectionBlurBackground from './manipulate-section-blur-background.webp';

export function ManipulateDataSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative rounded-3xl bg-green-1000 p-4 pt-6 sm:py-24 md:px-6 lg:px-12 2xl:px-24 md:pt-24 lg:py-[120px]',
        className,
      )}
    >
      <DecorationIsolation className="rounded-3xl">
        <Image
          src={manipulateSectionBlurBackground}
          alt=""
          className="absolute w-full h-full object-cover object-right"
        />
      </DecorationIsolation>
      <Heading as="h3" size="md" className="text-white text-center">
        Transform Subgraph
      </Heading>
      <p className="mt-4 text-white/80 text-center text-balance">
        Optional reshape after you have Mesh subgraph SDL -- Automatic Compose transforms or edit
        the committed <code>.graphql</code> by hand.
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-8 mt-8 lg:mt-16 xl:[&>*:not(:first-child)]:pl-8 max-sm:[&>*:not(:first-child)]:pt-4 max-sm:divide-y xl:divide-x divide-green-700">
        <ListItem
          title="Automatic"
          description="Ordered transforms in mesh.config.ts -- rename, filter, prefix at Compose time."
          href="/v2/transforms/automatic"
        />
        <ListItem
          title="By hand"
          description="Commit the public shape in subgraph SDL when you already own the names."
          href="/v2/transforms/by-hand"
        />
        <ListItem
          title="Serve Subgraph"
          description="Run SDL as its own Federation endpoint for any compatible gateway."
          href="/v2/serve-subgraph"
        />
        <ListItem
          title="Serve Supergraph"
          description="Compose and run on Hive Gateway; Apollo Router for Connect-compatible graphs."
          href="/v2/serve"
        />
      </dl>
    </section>
  );
}

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  href: string;
}
function ListItem({ title, description, href, ...rest }: ListItemProps) {
  return (
    <div {...rest}>
      <dt className="text-white font-medium">
        <Anchor href={href} className="hive-focus rounded-sm underline-offset-4 hover:underline">
          {title}
        </Anchor>
      </dt>
      <dd className="text-white/80 block mt-2">{description}</dd>
    </div>
  );
}
