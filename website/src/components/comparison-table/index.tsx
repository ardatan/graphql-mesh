import { cn, Heading } from '@theguild/components';
import { Table, TableCell, TableHeader, TableRow } from './table';

type Entry = { text: string; score: number };
const data: Array<{
  name: string;
  'Productivity / Maintainability': Entry;
  'Unified Schema design': Entry;
  'Sub-services support': Entry;
}> = [
  {
    name: 'GraphQL Mesh',
    'Productivity / Maintainability': {
      text: 'Packages with a server, caching, Envelop plugins, and large sub-service types support. Configuration-based with custom resolvers.',
      score: 2,
    },
    'Unified Schema design': {
      text: 'Flexible Schema design with Transforms and custom resolvers support.',
      score: 2,
    },
    'Sub-services support': {
      text: 'Support for a large range of types of sub-services and databases.',
      score: 2,
    },
  },
  {
    name: 'GraphQL Tools',
    'Productivity / Maintainability': {
      text: 'Programmatic approach at the Gateway level. Type merging makes it easier to deal with sub-services conflicts.',
      score: 1,
    },
    'Unified Schema design': {
      text: 'Access to all GraphQL Schema building libraries.',
      score: 2,
    },
    'Sub-services support': {
      text: 'Only supports GraphQL sub-services out of the box. Other sub-service types can be supported with Schema extensions at the Gateway level.',
      score: 1,
    },
  },
  {
    name: 'Apollo Server with DataSources',
    'Productivity / Maintainability': {
      text: 'Requires a lot of coding and maintenance work at the DataSources level.',
      score: 0,
    },
    'Unified Schema design': {
      text: 'Access to all GraphQL Schema building libraries.',
      score: 2,
    },
    'Sub-services support': {
      text: 'Integrating with some types of sub-services might require some extra work.',
      score: 1,
    },
  },
  {
    name: 'Apollo Federation',
    'Productivity / Maintainability': {
      text: 'Rover CLI and Apollo Studio. Only the Apollo Gateway needs maintenance.',
      score: 2,
    },
    'Unified Schema design': {
      text: 'Access to all GraphQL Schema building libraries.',
      score: 2,
    },
    'Sub-services support': {
      text: "Only supports 'Federation compliant' GraphQL sub-services.",
      score: 0,
    },
  },
  {
    name: 'Hasura',
    'Productivity / Maintainability': {
      text: 'Plug and play solution. Configuration-based with custom resolvers.',
      score: 2,
    },
    'Unified Schema design': {
      text: 'The Unified Schema is directly linked to the underlying database schema or sub-services design.',
      score: 1,
    },
    'Sub-services support': {
      text: 'Only supports GraphQL and REST sub-services and a set of databases.',
      score: 1,
    },
  },
];

const headers = Object.keys(data[0]);

export interface ComparisonTableProps extends React.HTMLAttributes<HTMLDivElement> {}
export function ComparisonTable({ children, className, ...rest }: ComparisonTableProps) {
  return (
    <section
      className={cn('py-6 sm:py-12 md:px-6 xl:px-[120px] lg:py-[120px]', className)}
      {...rest}
    >
      <header className="sm:text-center sm:text-balance">
        <Heading as="h3" size="md">
          Consider switching from other tools?
        </Heading>
        <p className="mt-4 mb-8 sm:mb-16 text-green-800">
          Learn the differences between Mesh, Apollo Federation, Hasura and GraphQL Tools
        </p>
      </header>
      {/* this is focusable (by default) because a keyboard user will scroll through the overflowing table with arrows */}
      <div className="hive-focus overflow-x-auto nextra-scrollbar [scrollbar-width:auto] max-sm:p-4 max-sm:-my-4 max-sm:-mx-8">
        <Table className="max-sm:text-sm sm:table-fixed max-sm:rounded-none">
          <thead>
            <TableRow>
              {headers.map(header => (
                <TableHeader className="sm:w-1/4 whitespace-pre" key={header}>
                  {header === 'name' ? '' : header}
                </TableHeader>
              ))}
            </TableRow>
          </thead>
          <tbody>
            {data.map(row => (
              <TableRow key={row.name} highlight={row.name === 'GraphQL Mesh'}>
                {Object.entries(row).map(([key, value]) => (
                  <TableCell className="align-top" key={key}>
                    {typeof value === 'string' ? (
                      value
                    ) : (
                      <>
                        <Dot filled={value.score} className="mb-4" />
                        {value.text}
                      </>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
}

function Dot({ filled, className }: { filled: number; className?: string }) {
  return (
    <svg
      width="16"
      height="17"
      viewBox="0 0 16 17"
      className={cn('text-green-800', className)}
      // right half of the circle
      fill={filled === 2 ? 'currentColor' : 'none'}
    >
      <g clipPath="url(#table-dot-clip-path)">
        {/* left half of the circle */}
        <rect y="0.920898" width="8" height="16" fill={filled === 1 ? 'currentColor' : 'none'} />
      </g>
      <rect x="0.5" y="1.4209" width="15" height="15" rx="7.5" stroke="currentColor" />
      <defs>
        <clipPath id="table-dot-clip-path">
          <rect y="0.920898" width="16" height="16" rx="8" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
