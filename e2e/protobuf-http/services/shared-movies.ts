export const Genre = {
  UNSPECIFIED: 0,
  ACTION: 1,
  DRAMA: 2,
} as const;

export type MovieRecord = {
  name: string;
  year: number;
  rating: number;
  cast: string[];
  genre: number;
};

export const Movies: MovieRecord[] = [
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Jeremy Renner'],
    name: 'Mission: Impossible Rogue Nation',
    rating: 0.97,
    year: 2015,
    genre: Genre.ACTION,
  },
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Henry Cavill'],
    name: 'Mission: Impossible - Fallout',
    rating: 0.93,
    year: 2018,
    genre: Genre.ACTION,
  },
  {
    cast: ['Leonardo DiCaprio', 'Jonah Hill', 'Margot Robbie'],
    name: 'The Wolf of Wall Street',
    rating: 0.78,
    year: 2013,
    genre: Genre.DRAMA,
  },
];

function asNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value);
}

/** OR-match across provided movie filter fields (same posture as grpc-example mock). */
export function filterMovies(
  movieFilter: Record<string, unknown> | undefined | null,
): MovieRecord[] {
  const filter = movieFilter ?? {};
  return Movies.filter(movie => {
    for (const [key, value] of Object.entries(filter)) {
      if (value == null || value === '' || value === 0 || value === 0n) continue;
      const left =
        key === 'year' || key === 'genre'
          ? asNumber(movie[key as keyof MovieRecord])
          : movie[key as keyof MovieRecord];
      const right = key === 'year' || key === 'genre' ? asNumber(value) : value;
      // Protobuf `float` is IEEE 754 binary32 — compare at that precision.
      if (key === 'rating' && typeof left === 'number' && typeof right === 'number') {
        if (Math.fround(left) === Math.fround(right)) return true;
        continue;
      }
      if (left === right) return true;
    }
    return false;
  });
}
