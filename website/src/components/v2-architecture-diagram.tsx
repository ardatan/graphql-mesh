/**
 * Compact Mesh v2 stack diagram for /v2/architecture.
 * Text labels only (no third-party logos). Scales for mobile via overflow-x.
 */
export function V2ArchitectureDiagram() {
  return (
    <figure className="not-prose my-6 w-full">
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-4 dark:border-neutral-700 dark:bg-neutral-900/50 sm:px-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 880 168"
          role="img"
          aria-label="Mesh stack: Sources to SDL to Mesh Compose to Hive Gateway or Apollo Router to Transports, with optional schema registry"
          className="mx-auto h-auto w-full min-w-[40rem] max-w-4xl text-neutral-800 dark:text-neutral-100"
        >
          <title>Mesh v2 architecture stack</title>
          <defs>
            <marker
              id="v2-arch-arrow"
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

          {/* Sources */}
          <LayerBox x={8} y={36} w={128} h={88} />
          <text
            x={72}
            y={62}
            className="fill-current text-[13px] font-semibold"
            textAnchor="middle"
          >
            Sources
          </text>
          <text
            x={72}
            y={84}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            REST · OpenAPI · SQL
          </text>
          <text
            x={72}
            y={100}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            gRPC · Mongo · …
          </text>

          <Arrow x1={136} y1={80} x2={168} y2={80} />

          {/* SDL */}
          <LayerBox x={168} y={36} w={148} h={88} accent />
          <text
            x={242}
            y={58}
            className="fill-current text-[13px] font-semibold"
            textAnchor="middle"
          >
            Subgraph SDL
          </text>
          <text
            x={242}
            y={80}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            Loader (optional)
          </text>
          <text
            x={242}
            y={96}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            or hand-written
          </text>
          <text
            x={242}
            y={112}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            .graphql
          </text>

          <Arrow x1={316} y1={80} x2={348} y2={80} />

          {/* Compose */}
          <LayerBox x={348} y={36} w={132} h={88} accent />
          <text
            x={414}
            y={70}
            className="fill-current text-[13px] font-semibold"
            textAnchor="middle"
          >
            Mesh Compose
          </text>
          <text
            x={414}
            y={92}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            subgraph / supergraph
          </text>

          {/* Compose → Serve */}
          <Arrow x1={480} y1={80} x2={520} y2={80} />

          {/* Serve peers */}
          <LayerBox x={520} y={28} w={196} h={104} accent />
          <text
            x={618}
            y={52}
            className="fill-current text-[13px] font-semibold"
            textAnchor="middle"
          >
            Serve (peers)
          </text>
          <PeerChip x={536} y={64} w={164} label="Hive Gateway (JS/TS)" />
          <PeerChip x={536} y={96} w={164} label="Apollo Router (Connect)" />

          <Arrow x1={716} y1={80} x2={748} y2={80} />

          {/* Transports */}
          <LayerBox x={748} y={36} w={124} h={88} />
          <text
            x={810}
            y={70}
            className="fill-current text-[13px] font-semibold"
            textAnchor="middle"
          >
            Transports
          </text>
          <text
            x={810}
            y={92}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            execute directives
          </text>

          {/* Optional registry — compact under Compose→Serve */}
          <path
            d="M414 124 V140 H618 V132"
            fill="none"
            strokeDasharray="4 3"
            className="stroke-neutral-400 dark:stroke-neutral-500"
            strokeWidth={1.25}
            markerEnd="url(#v2-arch-arrow)"
          />
          <rect
            x={456}
            y={132}
            width={120}
            height={28}
            rx={6}
            className="fill-white stroke-neutral-300 dark:fill-neutral-800 dark:stroke-neutral-600"
            strokeWidth={1.25}
            strokeDasharray="4 3"
          />
          <text
            x={516}
            y={150}
            className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
            textAnchor="middle"
          >
            Registry (optional)
          </text>
        </svg>
      </div>
      <figcaption className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Generated or authored SDL enters the same Compose → serve → transport path.
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

function PeerChip({ x, y, w, label }: { x: number; y: number; w: number; label: string }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={26}
        rx={6}
        className="fill-white stroke-neutral-300 dark:fill-neutral-900 dark:stroke-neutral-600"
        strokeWidth={1}
      />
      <text
        x={x + w / 2}
        y={y + 17}
        className="fill-current text-[11px] font-medium"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className="stroke-neutral-400 dark:stroke-neutral-500"
      strokeWidth={1.5}
      markerEnd="url(#v2-arch-arrow)"
    />
  );
}
