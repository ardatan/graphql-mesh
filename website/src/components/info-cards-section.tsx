import { Anchor, Heading, InfoCard } from '@theguild/components';
import { V2FlowDiagram } from './v2-flow-diagram';

export function InfoCardsSection() {
  return (
    <section className="px-4 py-6 sm:py-12 md:px-6 xl:px-[120px] lg:py-24">
      <Heading as="h2" size="md" className="text-balance text-center">
        From source to gateway
      </Heading>
      <p className="mx-auto mt-4 max-w-2xl text-balance text-center text-green-800">
        Generate subgraph SDL, Transform when you need a reshape, Serve a subgraph endpoint, Compose
        into a supergraph, then run it on a Gateway.
      </p>

      <V2FlowDiagram
        className="mt-8 md:mt-12"
        ariaLabel="Mesh v2 journey from Generate through Gateway"
        steps={[
          { title: 'Generate', lines: ['Subgraph SDL'], accent: true },
          { title: 'Transform', lines: ['Optional reshape'], accent: true },
          { title: 'Serve', lines: ['Subgraph URL'], accent: true },
          { title: 'Compose', lines: ['Supergraph'], accent: true },
          { title: 'Gateway', lines: ['Hive / Router'], accent: true },
        ]}
      />

      <ul className="mt-6 flex flex-row flex-wrap justify-center gap-2 md:mt-12 md:gap-6">
        <InfoCard
          as="li"
          href="/v2/paths/generate"
          heading="Generate"
          icon={<StepIcon n="1" />}
          className="flex-1 basis-full rounded-2xl sm:basis-[calc(50%-0.5rem)] md:basis-0 md:rounded-3xl"
        >
          Bootstrap Federation-ready subgraph SDL from OpenAPI, SQL, protobuf, and more -- or
          Hand-write / Generate-then-edit.
        </InfoCard>
        <InfoCard
          as="li"
          href="/v2/transforms"
          heading="Transform"
          icon={<StepIcon n="2" />}
          className="flex-1 basis-full rounded-2xl sm:basis-[calc(50%-0.5rem)] md:basis-0 md:rounded-3xl"
        >
          Optional Automatic Compose transforms or By-hand SDL edits before Composition.
        </InfoCard>
        <InfoCard
          as="li"
          href="/v2/serve-subgraph"
          heading="Serve"
          icon={<StepIcon n="3" />}
          className="flex-1 basis-full rounded-2xl sm:basis-[calc(50%-0.5rem)] md:basis-0 md:rounded-3xl"
        >
          Run subgraph SDL as its own Federation endpoint (Hive Gateway subgraph or{' '}
          <code>buildSubgraphSchema</code>).
        </InfoCard>
        <InfoCard
          as="li"
          href="/v2/compose"
          heading="Compose"
          icon={<StepIcon n="4" />}
          className="flex-1 basis-full rounded-2xl sm:basis-[calc(50%-0.5rem)] md:basis-0 md:rounded-3xl"
        >
          Mesh Compose or another Federation-compatible composer builds the supergraph.
        </InfoCard>
        <InfoCard
          as="li"
          href="/v2/serve"
          heading="Gateway"
          icon={<StepIcon n="5" />}
          className="flex-1 basis-full rounded-2xl sm:basis-full md:basis-0 md:rounded-3xl"
        >
          Serve Supergraph on Hive Gateway; Apollo Router is a peer for Connect-compatible graphs.
        </InfoCard>
      </ul>

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-beige-100 px-6 py-6 text-center md:mt-14 md:px-10 md:py-8">
        <Heading as="h3" size="sm" className="text-balance">
          Enhance the Federation you already run
        </Heading>
        <p className="mt-3 text-balance text-green-800">
          Mesh is platform, registry, and gateway independent. Keep GraphOS, Hive, Rover, or your
          current gateway -- add Mesh Federation subgraphs for REST, SQL, gRPC, and more. Publish
          SDL or Serve Subgraph when another gateway must call a Mesh-backed URL. Hive Gateway
          remains preferred for the full Mesh transport surface.
        </p>
        <p className="mt-4">
          <Anchor
            href="/v2/faq"
            className="hive-focus font-medium text-green-1000 underline-offset-4 hover:underline"
          >
            FAQ
          </Anchor>
          {' -- '}
          Router with SQL, Serve Subgraph vs Supergraph, and more.
        </p>
      </div>
    </section>
  );
}

function StepIcon({ n }: { n: string }) {
  return (
    <span
      className="flex size-6 items-center justify-center rounded-full border border-current text-xs font-semibold"
      aria-hidden
    >
      {n}
    </span>
  );
}
