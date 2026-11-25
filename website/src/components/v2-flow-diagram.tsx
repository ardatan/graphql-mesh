import type { ReactNode } from 'react';

export type V2FlowStep = {
  title: string;
  /** Short subtitle lines under the title (prefer 1–2). */
  lines?: string[];
  /** Alias for a single subtitle line. */
  subtitle?: string;
  accent?: boolean;
};

type Props = {
  steps: V2FlowStep[];
  ariaLabel: string;
  caption?: ReactNode;
  /** Optional dashed chip under the flow (e.g. registry). */
  footnote?: { label: string; fromStep: number; toStep: number };
  className?: string;
};

const BOX_W = 148;
const BOX_H = 92;
const GAP = 32;
const PAD_X = 12;
const PAD_Y = 24;

/**
 * Compact horizontal flow diagram matching /v2/architecture SVG aesthetic.
 * Every step should carry a short subtitle so boxes look even.
 */
export function V2FlowDiagram({ steps, ariaLabel, caption, footnote, className }: Props) {
  const width = PAD_X * 2 + steps.length * BOX_W + (steps.length - 1) * GAP;
  const height = footnote ? 172 : 140;
  const midY = PAD_Y + BOX_H / 2;
  const markerId = `v2-flow-arrow-${hashId(ariaLabel)}`;

  return (
    <figure className={['not-prose my-6 w-full', className].filter(Boolean).join(' ')}>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-4 dark:border-neutral-700 dark:bg-neutral-900/50 sm:px-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
          className="mx-auto h-auto w-full max-w-4xl text-neutral-800 dark:text-neutral-100"
          style={{ minWidth: Math.min(width, 680) }}
        >
          <title>{ariaLabel}</title>
          <defs>
            <marker
              id={markerId}
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

          {steps.map((step, i) => {
            const x = PAD_X + i * (BOX_W + GAP);
            const y = PAD_Y;
            const cx = x + BOX_W / 2;
            const subtitles = normalizeSubtitles(step);
            // Reserve title + up to 2 subtitle lines so empty/full boxes align.
            const blockH = 16 + Math.max(subtitles.length, 1) * 14;
            const blockTop = y + (BOX_H - blockH) / 2 + 12;

            return (
              <g key={`${step.title}-${i}`}>
                <LayerBox x={x} y={y} w={BOX_W} h={BOX_H} accent={step.accent} />
                <text
                  x={cx}
                  y={blockTop}
                  className="fill-current text-[12px] font-semibold"
                  textAnchor="middle"
                >
                  {step.title}
                </text>
                {subtitles.slice(0, 2).map((line, li) => (
                  <text
                    key={li}
                    x={cx}
                    y={blockTop + 16 + li * 14}
                    className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
                    textAnchor="middle"
                  >
                    {line}
                  </text>
                ))}
                {i < steps.length - 1 ? (
                  <line
                    x1={x + BOX_W}
                    y1={midY}
                    x2={x + BOX_W + GAP}
                    y2={midY}
                    className="stroke-neutral-400 dark:stroke-neutral-500"
                    strokeWidth={1.5}
                    markerEnd={`url(#${markerId})`}
                  />
                ) : null}
              </g>
            );
          })}

          {footnote ? (
            <Footnote
              steps={steps}
              footnote={footnote}
              midY={midY}
              markerId={markerId}
              boxW={BOX_W}
              gap={GAP}
              padX={PAD_X}
            />
          ) : null}
        </svg>
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function normalizeSubtitles(step: V2FlowStep): string[] {
  if (step.lines?.length) return step.lines;
  if (step.subtitle) return [step.subtitle];
  return [];
}

function Footnote({
  steps,
  footnote,
  midY,
  markerId,
  boxW,
  gap,
  padX,
}: {
  steps: V2FlowStep[];
  footnote: { label: string; fromStep: number; toStep: number };
  midY: number;
  markerId: string;
  boxW: number;
  gap: number;
  padX: number;
}) {
  const from = Math.max(0, Math.min(steps.length - 1, footnote.fromStep));
  const to = Math.max(0, Math.min(steps.length - 1, footnote.toStep));
  const x1 = padX + from * (boxW + gap) + boxW / 2;
  const x2 = padX + to * (boxW + gap) + boxW / 2;
  const chipW = 132;
  const chipX = (x1 + x2) / 2 - chipW / 2;
  const y = midY + 46;

  return (
    <g>
      <path
        d={`M${x1} ${midY + BOX_H / 2 - 10} V${y + 14} H${x2} V${midY + 22}`}
        fill="none"
        strokeDasharray="4 3"
        className="stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth={1.25}
        markerEnd={`url(#${markerId})`}
      />
      <rect
        x={chipX}
        y={y}
        width={chipW}
        height={28}
        rx={6}
        className="fill-white stroke-neutral-300 dark:fill-neutral-800 dark:stroke-neutral-600"
        strokeWidth={1.25}
        strokeDasharray="4 3"
      />
      <text
        x={chipX + chipW / 2}
        y={y + 18}
        className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
        textAnchor="middle"
      >
        {footnote.label}
      </text>
    </g>
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

function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
