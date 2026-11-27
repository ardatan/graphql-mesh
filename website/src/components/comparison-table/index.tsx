import { cn, Heading } from '@theguild/components';
import { Table, TableCell, TableHeader, TableRow } from './table';

type Entry = { text: string; score: number };
const data: Array<{
  name: string;
  'Non-GraphQL → subgraph': Entry;
  Connectors: Entry;
  Transforms: Entry;
  'Gateway / registry': Entry;
}> = [
  {
    name: 'GraphQL Mesh',
    'Non-GraphQL → subgraph': {
      text: 'Generate Federation-ready Mesh subgraph SDL from REST, SOAP, OData, gRPC, SQL, and more, or Hand-write / Generate-then-edit.',
      score: 2,
    },
    Connectors: {
      text: 'HTTP/REST Connectors (`@connect` / `@source`) emit natively; run on Apollo Router and Hive Gateway. Mesh protocols (SQL, gRPC, …) still work via Serve Subgraph.',
      score: 2,
    },
    Transforms: {
      text: 'Optional Transform Subgraph (Automatic Compose transforms or edit the .graphql by hand) before Compose.',
      score: 2,
    },
    'Gateway / registry': {
      text: 'Gateway-independent: compose once, then run with any Federation Gateway (Hive Gateway, Apollo Router, peers).',
      score: 2,
    },
  },
  {
    name: 'Apollo Federation',
    'Non-GraphQL → subgraph': {
      text: 'Expects Federation-compliant GraphQL subgraphs. Non-GraphQL sources need a separate subgraph process you own.',
      score: 0,
    },
    Connectors: {
      text: 'Router executes Connectors on Connect-shaped SDL. Mesh can generate that SDL for you and drop it into GraphOS / Router.',
      score: 1,
    },
    Transforms: {
      text: 'Schema shape lives in each subgraph codebase; no Mesh-style Automatic / By-hand transform path on composed SDL.',
      score: 1,
    },
    'Gateway / registry': {
      text: 'Strong GraphOS / Router story; Mesh drops in as Federation subgraphs beside the stack you already run.',
      score: 1,
    },
  },
  {
    name: 'Schema Stitching',
    'Non-GraphQL → subgraph': {
      text: 'Typically GraphQL executors + programmatic merge. Non-GraphQL sources need custom gateway-level wiring.',
      score: 1,
    },
    Connectors: {
      text: 'No Connectors contract: REST/HTTP usually wired with custom resolvers or DataLoader code at the stitch layer.',
      score: 0,
    },
    Transforms: {
      text: 'In-process stitchSchemas / type merge config, not Federation subgraph SDL + Transform Subgraph.',
      score: 1,
    },
    'Gateway / registry': {
      text: 'Often one stitched GraphQLSchema in-process. Mesh migrates you to subgraph SDL + Compose + any Federation Gateway.',
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
          Beside plain Federation and Schema Stitching: non-GraphQL → subgraph, Connectors,
          transforms, and gateway independence
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
