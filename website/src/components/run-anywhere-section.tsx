import { Anchor, ArrowIcon, cn, Heading } from '@theguild/components';

export interface RunAnywhereSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export function RunAnywhereSection(props: RunAnywhereSectionProps) {
  return (
    <section
      {...props}
      className={cn(
        'relative rounded-3xl bg-blue-400 text-green-1000 p-4 pt-6 sm:py-24 md:px-6 lg:px-12 2xl:px-24 md:py-[120px]',
        props.className,
      )}
    >
      <Heading as="h3" size="md" className="text-center">
        Run anywhere
      </Heading>
      {/* the design has text-green-800 here, but it doesn't pass the contrast check */}
      <p className="mt-4 text-center text-balance max-w-3xl mx-auto">
        Mesh is gateway-independent. Serve the supergraph on{' '}
        <strong className="font-medium">Hive Gateway</strong> (any JS environment),{' '}
        <strong className="font-medium">Apollo Router</strong> (Rust) for Connect-compatible SDL, or
        any Federation Gateway -- and serve a Mesh subgraph on Yoga (or any GraphQL server) with{' '}
        <code className="text-sm">buildSubgraphSchema</code>.
      </p>

      <ul className="flex mt-4 sm:mt-8 lg:mt-12 flex-wrap gap-2 sm:gap-4 max-sm:grid max-sm:grid-cols-2 justify-center items-center max-w-[1200px] mx-auto">
        <ListItemAnchor href="/v2/serve/hive-gateway" highlighted>
          Hive Gateway
          <br />
          <span className="text-sm font-normal opacity-80">any JS env</span>
        </ListItemAnchor>
        <ListItemAnchor href="/v2/serve/apollo-router" highlighted>
          Apollo Router
          <br />
          <span className="text-sm font-normal opacity-80">Rust</span>
        </ListItemAnchor>
        <ListItemAnchor href="/v2/serve" highlighted>
          Any Federation
          <br />
          Gateway
        </ListItemAnchor>
        <ListItemAnchor href="/v2/guides/build-subgraph-schema" highlighted>
          buildSubgraphSchema
          <br />
          <span className="text-sm font-normal opacity-80">any JS GraphQL server</span>
        </ListItemAnchor>
      </ul>

      <p className="mt-8 sm:mt-12 text-center text-sm text-green-1000/80">
        Hive Gateway deploys across Node.js, Bun, Docker, and serverless
      </p>
      <ul className="flex mt-3 sm:mt-4 flex-wrap gap-2 sm:gap-3 max-sm:grid max-sm:grid-cols-3 justify-center items-center max-w-[1200px] mx-auto">
        <ListItemAnchor
          href="https://the-guild.dev/graphql/hive/docs/gateway/deployment/runtimes/nodejs"
          compact
        >
          Node.js
        </ListItemAnchor>
        <ListItemAnchor
          href="https://the-guild.dev/graphql/hive/docs/gateway/deployment/runtimes/bun"
          compact
        >
          Bun
        </ListItemAnchor>
        <ListItemAnchor
          href="https://the-guild.dev/graphql/hive/docs/gateway/deployment/docker"
          compact
        >
          Docker
        </ListItemAnchor>
        <ListItemAnchor
          href="https://the-guild.dev/graphql/hive/docs/gateway/deployment/serverless/cloudflare-workers"
          compact
        >
          Cloudflare Workers
        </ListItemAnchor>
        <ListItemAnchor
          href="https://the-guild.dev/graphql/hive/docs/gateway/deployment/serverless/aws-lambda"
          compact
        >
          AWS Lambda
        </ListItemAnchor>
        <ListItemAnchor
          href="https://the-guild.dev/graphql/hive/docs/gateway/deployment/serverless/google-cloud-platform"
          compact
        >
          GCP
        </ListItemAnchor>
        <ListItemAnchor
          href="https://the-guild.dev/graphql/hive/docs/gateway/deployment/serverless/azure-functions"
          compact
        >
          Azure Functions
        </ListItemAnchor>
        <ListItemAnchor href="https://the-guild.dev/graphql/hive/docs/gateway/deployment" compact>
          & more
        </ListItemAnchor>
      </ul>
    </section>
  );
}

function ListItemAnchor({
  children,
  href,
  className,
  highlighted,
  compact,
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
  highlighted?: boolean;
  compact?: boolean;
}) {
  return (
    <li className={className}>
      <Anchor
        className={cn(
          'hive-focus flex items-center gap-4 bg-blue-200 hover:bg-white rounded-2xl px-4 sm:px-6 md:px-8 hover:[&:not(:focus)]:ring-blue-300 hover:ring',
          compact ? 'h-14 text-sm' : 'h-[102px]',
          highlighted && 'bg-blue-100',
        )}
        href={href}
      >
        {children}
        {!compact && <ArrowIcon className="w-6 h-6 max-sm:hidden shrink-0" />}
      </Anchor>
    </li>
  );
}
