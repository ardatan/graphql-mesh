/**
 * Schema Stitching type-merging diagram for /v2/concepts/stitching.
 * Inspired by the Schema Stitching site "many schemas, one API" / type-merging story;
 * aesthetic matches V2ArchitectureDiagram (rounded boxes, sky accent, neutral arrows).
 */
export function V2StitchingDiagram() {
  return (
    <figure className="not-prose my-6 w-full">
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-4 dark:border-neutral-700 dark:bg-neutral-900/50 sm:px-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 720 268"
          role="img"
          aria-label="Schema Stitching type merging: Users and Posts subschemas contribute fields to one User type on the gateway"
          className="mx-auto h-auto w-full min-w-[36rem] max-w-3xl text-neutral-800 dark:text-neutral-100"
        >
          <title>Schema Stitching type merging</title>
          <defs>
            <marker
              id="v2-stitch-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-neutral-400 dark:fill-neutral-500" />
            </marker>
          </defs>

          {/* Users subschema */}
          <LayerBox x={24} y={24} w={168} h={96} />
          <text
            x={108}
            y={48}
            className="fill-current text-[12px] font-semibold"
            textAnchor="middle"
          >
            Users subschema
          </text>
          <text
            x={108}
            y={70}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            type User
          </text>
          <text
            x={108}
            y={88}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            id / email
          </text>
          <text
            x={108}
            y={106}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            Query.userById
          </text>

          {/* Posts subschema */}
          <LayerBox x={24} y={148} w={168} h={96} />
          <text
            x={108}
            y={172}
            className="fill-current text-[12px] font-semibold"
            textAnchor="middle"
          >
            Posts subschema
          </text>
          <text
            x={108}
            y={194}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            type User
          </text>
          <text
            x={108}
            y={212}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            id / posts
          </text>
          <text
            x={108}
            y={230}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            Query.postUserById
          </text>

          {/* Arrows into stitchSchemas */}
          <line
            x1={192}
            y1={72}
            x2={268}
            y2={118}
            className="stroke-neutral-400 dark:stroke-neutral-500"
            strokeWidth={1.5}
            markerEnd="url(#v2-stitch-arrow)"
          />
          <line
            x1={192}
            y1={196}
            x2={268}
            y2={150}
            className="stroke-neutral-400 dark:stroke-neutral-500"
            strokeWidth={1.5}
            markerEnd="url(#v2-stitch-arrow)"
          />

          {/* stitchSchemas */}
          <LayerBox x={276} y={92} w={152} h={84} accent />
          <text
            x={352}
            y={122}
            className="fill-current text-[12px] font-semibold"
            textAnchor="middle"
          >
            stitchSchemas
          </text>
          <text
            x={352}
            y={142}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            type merging
          </text>
          <text
            x={352}
            y={158}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            merge: User
          </text>

          <line
            x1={428}
            y1={134}
            x2={492}
            y2={134}
            className="stroke-neutral-400 dark:stroke-neutral-500"
            strokeWidth={1.5}
            markerEnd="url(#v2-stitch-arrow)"
          />

          {/* Gateway schema */}
          <LayerBox x={500} y={74} w={196} h={120} accent />
          <text
            x={598}
            y={102}
            className="fill-current text-[12px] font-semibold"
            textAnchor="middle"
          >
            Gateway schema
          </text>
          <text
            x={598}
            y={124}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            type User
          </text>
          <text
            x={598}
            y={142}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            id / email / posts
          </text>
          <text
            x={598}
            y={162}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            one executable GraphQLSchema
          </text>
        </svg>
      </div>
      <figcaption className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Type merging: several subschemas contribute fields to the same type; Schema Stitching runs
        the merged gateway schema.
      </figcaption>
    </figure>
  );
}

function LayerBox({
  x,
  y,
  w,
  h,
  accent = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent?: boolean;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={10}
      className={
        accent
          ? 'fill-sky-50 stroke-sky-400/80 dark:fill-sky-950/40 dark:stroke-sky-500/70'
          : 'fill-white stroke-neutral-300 dark:fill-neutral-800 dark:stroke-neutral-600'
      }
      strokeWidth={1.5}
    />
  );
}
