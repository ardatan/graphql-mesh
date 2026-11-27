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
      <Heading as="h3" size="md" className="text-white text-center text-balance">
        From subgraph SDL to any Federation Gateway
      </Heading>
      <p className="mt-4 text-white/80 text-center text-balance">
        Same order as the docs: generate and optionally transform subgraphs, serve a subgraph peer
        when needed, compose, then serve the supergraph on the gateway you already run.
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-6 mt-8 lg:mt-16 xl:[&>*:not(:first-child)]:pl-6 max-sm:[&>*:not(:first-child)]:pt-4 max-sm:divide-y xl:divide-x divide-green-700">
        <ListItem
          title="Generate"
          description="Emit Federation-ready Mesh subgraph SDL from REST, SQL, gRPC, and more."
          href="/v2/paths/generate"
        />
        <ListItem
          title="Transform"
          description="Optional reshape -- Automatic Compose transforms or edit the .graphql by hand."
          href="/v2/transforms"
        />
        <ListItem
          title="Serve Subgraph"
          description="When a foreign gateway needs a Mesh-backed Federation URL -- Hive subgraph or buildSubgraphSchema."
          href="/v2/serve-subgraph"
        />
        <ListItem
          title="Compose"
          description="Mesh Compose (or your registry) turns subgraphs into a supergraph."
          href="/v2/compose"
        />
        <ListItem
          title="Serve Supergraph"
          description="Run with any Federation Gateway -- Hive Gateway, Apollo Router, and peers."
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
