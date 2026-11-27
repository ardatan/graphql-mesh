import { cn, Heading } from '@theguild/components';
import { Table, TableCell, TableHeader, TableRow } from './table';

type Entry = { text: string; score: number };
const data: Array<{
  name: string;
  Contract: Entry;
  'Config level': Entry;
  Transforms: Entry;
  Gateway: Entry;
}> = [
  {
    name: 'GraphQL Mesh',
    Contract: {
      // Portable subgraph SDL is the product: Mesh directives + Connectors,
      // generated or authored, then composed like any other Federation peer.
      text: 'Federation subgraph SDL: Mesh directives for REST, SOAP, OData, gRPC, SQL, and more, plus HTTP/REST Connectors (`@connect` / `@source`). One portable contract for compose and serve.',
      score: 2,
    },
    'Config level': {
      text: 'Subgraph-level. Generate, Hand-write, or Generate-then-edit the SDL; the gateway only serves the composed supergraph (or a Mesh Serve Subgraph peer).',
      score: 2,
    },
    Transforms: {
      text: 'Optional Transform Subgraph (Automatic Compose transforms or edit the .graphql by hand) before Compose.',
      score: 2,
    },
    Gateway: {
      text: 'Gateway-independent. Compose once; run on Hive Gateway, Apollo Router, or any Federation-compatible gateway / router.',
      score: 2,
    },
  },
  {
    name: 'Apollo Federation',
    Contract: {
      text: 'Federation subgraph GraphQL SDL. Connectors are Connect-shaped SDL that the Router executes; non-Connect sources need a subgraph process you own (Mesh can supply that SDL).',
      score: 1,
    },
    'Config level': {
      text: 'Mixed. Entity/subgraph shape lives in each subgraph; Connector execution is gateway/Router-side.',
      score: 1,
    },
    Transforms: {
      text: 'Schema shape owned per subgraph codebase; no Mesh-style Automatic / By-hand transform path on composed SDL.',
      score: 1,
    },
    Gateway: {
      text: 'Strong GraphOS / Router story. Mesh drops in as Federation subgraph peers beside the stack you already run.',
      score: 1,
    },
  },
  {
    name: 'Schema Stitching',
    Contract: {
      text: 'No portable Federation subgraph contract. Integration is an executor map and type-merge config at the stitch layer.',
      score: 0,
    },
    'Config level': {
      text: 'Gateway-level. stitchSchemas / type merge usually lives in-process with the stitched GraphQLSchema.',
      score: 0,
    },
    Transforms: {
      text: 'Merge and filter config in the gateway, not a Transform Subgraph step on Federation SDL.',
      score: 1,
    },
    Gateway: {
      text: 'Typically one in-process schema. Mesh migrates you to subgraph SDL + Compose + any Federation Gateway.',
      score: 0,
    },
  },
];

const headers = Object.keys(data[0]);

export interface ComparisonTableProps extends React.HTMLAttributes<HTMLDivElement> {}
export function ComparisonTable({ children, className, ...rest }: ComparisonTableProps) {
  return (
    <section
      id="consider-switching-from-other-tools"
      className={cn('py-6 sm:py-12 md:px-6 xl:px-[120px] lg:py-[120px]', className)}
      {...rest}
    >
      <header className="sm:text-center sm:text-balance">
        <Heading as="h3" size="md">
          What Mesh adds
        </Heading>
        <p className="mt-4 mb-8 sm:mb-16 text-green-800">
          The useful contrast is not “can it talk to REST?”. It is where the contract lives, whether
          config is subgraph-portable, and whether the gateway is locked in.
        </p>
      </header>
      {/* this is focusable (by default) because a keyboard user will scroll through the overflowing table with arrows */}
      <div className="hive-focus overflow-x-auto nextra-scrollbar [scrollbar-width:auto] max-sm:p-4 max-sm:-my-4 max-sm:-mx-8">
        <Table className="max-sm:text-sm sm:table-fixed max-sm:rounded-none">
          <thead>
            <TableRow>
              {headers.map(header => (
                <TableHeader
                  className={cn('whitespace-pre', headers.length > 4 ? 'sm:w-[20%]' : 'sm:w-1/4')}
                  key={header}
                >
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
