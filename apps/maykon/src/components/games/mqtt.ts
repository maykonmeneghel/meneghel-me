/**
 * MQTT topic-filter semantics, per the OASIS spec:
 *   +  matches exactly one topic level
 *   #  matches the remaining levels, and must be the final level
 *
 * Small enough to be worth writing rather than pulling a library in — and the
 * whole point of the chapter is that the rule really is this short.
 */

export const TOPICS = [
  'farm/greenhouse/soil-1/temp',
  'farm/greenhouse/soil-1/moisture',
  'farm/greenhouse/soil-2/temp',
  'farm/greenhouse/soil-2/moisture',
  'farm/field/soil-3/temp',
  'farm/field/soil-3/moisture',
  'farm/field/pump-1/status',
  'home/office/thermostat/temp',
] as const;

export type Topic = (typeof TOPICS)[number];

export function matches(filter: string, topic: string): boolean {
  const f = filter.split('/');
  const t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return i === f.length - 1;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

export type FilterError = 'hash' | 'plus' | 'empty' | null;

export function validate(filter: string): FilterError {
  if (!filter) return null;
  const levels = filter.split('/');
  for (let i = 0; i < levels.length; i++) {
    const l = levels[i];
    if (l === '') return 'empty';
    if (l.includes('#') && (l !== '#' || i !== levels.length - 1)) return 'hash';
    if (l.includes('+') && l !== '+') return 'plus';
  }
  return null;
}

/**
 * Missions are defined by the set of topics they must select, never by an
 * expected filter string — so every equivalent answer is accepted.
 */
export const MISSIONS: Record<string, readonly string[]> = {
  greenhouse: TOPICS.filter((t) => t.startsWith('farm/greenhouse/')),
  temps: TOPICS.filter((t) => t.endsWith('/temp')),
  moisture: TOPICS.filter((t) => t.startsWith('farm/') && t.endsWith('/moisture')),
};

export function solves(filter: string, missionId: string): boolean {
  if (validate(filter) !== null || !filter) return false;
  const target = MISSIONS[missionId];
  if (!target) return false;
  const got = TOPICS.filter((t) => matches(filter, t));
  return got.length === target.length && target.every((t) => got.includes(t as Topic));
}

/** A plausible payload for a topic, so the stream reads like a real fleet. */
export function payload(topic: string): string {
  if (topic.endsWith('/temp')) return `${(18 + Math.random() * 14).toFixed(1)} °C`;
  if (topic.endsWith('/moisture')) return `${Math.round(22 + Math.random() * 56)} %`;
  if (topic.endsWith('/status')) return Math.random() > 0.35 ? 'on' : 'off';
  return '—';
}
