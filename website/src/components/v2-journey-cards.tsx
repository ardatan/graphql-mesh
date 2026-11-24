import { InfoCard } from '@theguild/components';

/**
 * Equal-weight Mesh v2 journey cards (Generate / Hand-write / Generate-then-edit).
 * Uses landing-page InfoCard styling -- no primary funnel.
 */
export function V2JourneyCards() {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 md:mt-8 md:gap-6">
      <InfoCard
        href="/v2/paths/generate"
        heading="Generate"
        icon={<GenerateIcon />}
        className="flex-1 basis-full rounded-2xl sm:basis-[calc(50%-0.5rem)] md:basis-0 md:rounded-3xl"
      >
        Bootstrap from OpenAPI, SQL, Mongo, protobuf, and more. Read the emitted SDL.
      </InfoCard>
      <InfoCard
        href="/v2/paths/hand-write"
        heading="Hand-write"
        icon={<HandWriteIcon />}
        className="flex-1 basis-full rounded-2xl sm:basis-[calc(50%-0.5rem)] md:basis-0 md:rounded-3xl"
      >
        Author <code>.graphql</code> (human or AI) into Compose and schema registries.
      </InfoCard>
      <InfoCard
        href="/v2/paths/generate-then-edit"
        heading="Generate-then-edit"
        icon={<EditIcon />}
        className="flex-1 basis-full rounded-2xl sm:basis-full md:basis-0 md:rounded-3xl"
      >
        Generate, dislike the shape, edit the SDL, re-compose.
      </InfoCard>
    </div>
  );
}

function GenerateIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.5 7.5h15M4.5 12h9M4.5 16.5h12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M17.25 13.5v6M14.25 16.5h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HandWriteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 19.5h4.2L18.75 9.95a2.12 2.12 0 0 0 0-3L17.05 5.25a2.12 2.12 0 0 0-3 0L5 14.3v5.2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M13.2 6.9l3.9 3.9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.5 6.75h9M4.5 12h6M4.5 17.25h7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14.25 16.2 18.6 7.5l2.1 1.05-4.35 8.7-2.4.45.3-1.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}
