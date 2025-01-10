import { Fragment } from 'react';
import {
  Anchor,
  ArrowIcon,
  cn,
  DecorationIsolation,
  Heading,
  MeshIcon,
} from '@theguild/components';

const datasources = [
  {
    name: 'GraphQL',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/graphql',
  },
  {
    name: 'OpenAPI',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/openapi',
  },
  {
    name: 'gRPC',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/grpc',
  },
  {
    name: 'JSON Schema',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/json-schema',
  },
  {
    name: 'SOAP',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/soap',
  },
  {
    name: 'OData',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/odata',
  },
  {
    name: 'Thrift',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/thrift',
  },
  {
    name: 'SQLite',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/sqlite',
  },
  {
    name: 'MySQL',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/mysql',
  },
  {
    name: 'Neo4j',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/neo4j',
  },
  {
    name: 'PostgreSQL',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/postgres',
  },
  {
    name: 'MongoDB',
    href: 'https://the-guild.dev/graphql/mesh/v1/source-handlers/mongodb',
  },
];

export function DatasourcesListSection(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      {...props}
      className={cn(
        'bg-beige-100 relative rounded-3xl text-green-1000 p-4 pt-6 sm:py-24 md:px-6 lg:px-12 2xl:px-24 md:py-[120px]',
        props.className,
      )}
    >
      <DecorationIsolation className="absolute">
        <MeshIcon
          width={871}
          height={865}
          className="[&>g]:fill-none stroke-beige-300 [&>g]:stroke-[0.1px] [&>g]:[clip-path:none] right-0 bottom-0 absolute translate-x-1/2 translate-y-1/2"
        />
      </DecorationIsolation>
      <Heading as="h3" size="md" className="text-center relative">
        Query anything
      </Heading>
      <p className="mt-4 text-center text-balance text-green-800 relative">
        Deploy Mesh across any JavaScript environment, powered by its versatile Fetch API
        compatibility.
      </p>
      <ul className="flex flex-wrap gap-3 xl:gap-x-6 items-center justify-center mt-8 lg:mt-16 z-10 relative">
        {datasources.map((datasource, i) => (
          <Fragment key={datasource.name}>
            {i === Math.floor(datasources.length / 2) + 1 && (
              <li /* balancer */ className="w-full max-xl:hidden" />
            )}
            <li key={datasource.name}>
              <Anchor
                className="hive-focus rounded-full block px-4 lg:px-6 lg:py-4 py-3 bg-beige-200 hover:bg-beige-300 group/item transition"
                href={datasource.href}
                target="_blank"
              >
                {datasource.name}
                <ArrowIcon
                  viewBox="0 0 24 24"
                  width={16}
                  height={16}
                  className="-rotate-45 inline align-top -mr-1 group-hover/item:opacity-100 opacity-65 group-hover/item:translate-x-px group-hover/item:-translate-y-px transition group-focus/item:opacity-100 group-focus/item:translate-x-px group-focus/item:-translate-y-px"
                />
              </Anchor>
            </li>
          </Fragment>
        ))}
      </ul>
    </section>
  );
}
