import { Fragment } from 'react';
import { cn, DecorationIsolation, Heading, MeshIcon } from '@theguild/components';

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
      <DecorationIsolation className="absolute z-10">
        <MeshIcon
          width={871}
          height={865}
          className="[&>g]:fill-none stroke-beige-300 [&>g]:stroke-[0.1px] [&>g]:[clip-path:none] right-0 bottom-0 absolute translate-x-1/2 translate-y-1/2"
        />
      </DecorationIsolation>
      <Heading as="h3" size="md" className="text-center">
        Query anything
      </Heading>
      <p className="mt-4 text-center text-balance text-green-800">
        Deploy Mesh across any JavaScript environment, powered by its versatile Fetch API
        compatibility.
      </p>
      <ul className="flex flex-wrap gap-x-6 gap-y-3 items-center justify-center mt-8 lg:mt-16 z-10 relative">
        {datasources.map((datasource, i) => (
          <Fragment key={datasource.name}>
            {i === Math.floor(datasources.length / 2) + 1 && (
              <li /* balancer */ className="w-full max-xl:hidden" />
            )}
            <li
              className="rounded-full px-4 lg:px-6 lg:py-4 py-3 bg-beige-200"
              key={datasource.name}
            >
              {datasource.name}
            </li>
          </Fragment>
        ))}
      </ul>
    </section>
  );
}
