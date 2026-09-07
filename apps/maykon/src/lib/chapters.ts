/**
 * Numbering lives here rather than in the content, so moving a chapter between
 * tracks — or off the main page entirely — never means renumbering by hand.
 */
import type { Chapter, Track } from '../content';

export const MAIN_TRACKS: Track[] = ['mobile', 'platform', 'ai', 'spatial'];

const number = (list: Chapter[]): Chapter[] =>
  list.map((c, i) => ({ ...c, id: String(i + 1).padStart(2, '0') }));

/** The main narrative, in track order, numbered from 01. */
export const mainChapters = (all: Chapter[]): Chapter[] =>
  number(MAIN_TRACKS.flatMap((t) => all.filter((c) => c.track === t)));

/** The hardware page, numbered from 01 on its own. */
export const hardwareChapters = (all: Chapter[]): Chapter[] =>
  number(all.filter((c) => c.track === 'hardware'));

/** Where each act divider goes: the first chapter of each track. */
export const actAnchors = (all: Chapter[]): Record<Track, string | undefined> => {
  const out = {} as Record<Track, string | undefined>;
  for (const t of [...MAIN_TRACKS, 'hardware'] as Track[]) {
    out[t] = all.find((c) => c.track === t)?.slug;
  }
  return out;
};
