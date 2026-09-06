/**
 * The model behind the deep link chapter.
 *
 * Signing a user in through a browser and handing the result back to an app is
 * the most security-sensitive fifty lines in a mobile codebase, and the naive
 * version is the one every tutorial shows: register a custom URL scheme, let
 * the browser redirect to it, read the token off the query string.
 *
 * Three things go wrong with that, and all three are invisible until somebody
 * tries them:
 *
 *   1. A custom scheme is not owned by anybody. Any other app on the device can
 *      register `tradx://` too, and iOS gives the link to whichever it feels
 *      like. Universal Links are owned, because the domain vouches for the app.
 *   2. A token in a query string is written to logs, to history, and to the
 *      referrer. A one-time code is worth nothing by the time it is logged.
 *   3. Without PKCE, an attacker who intercepts the code can exchange it, since
 *      the exchange proves nothing about who started the flow.
 *
 * The model is a small attacker: given a configuration, it reports which of the
 * attacks land.
 */

export type LinkKind = 'customScheme' | 'universalLink';
export type Payload = 'token' | 'code';

export interface Config {
  link: LinkKind;
  /** What comes back on the redirect: the token itself, or a one-time code. */
  payload: Payload;
  /** Proof Key for Code Exchange: the app proves it started the flow. */
  pkce: boolean;
  /** Whether the code is refused the second time it is presented. */
  singleUse: boolean;
  /** Whether the callback carries and checks an unguessable state value. */
  stateParam: boolean;
}

export const NAIVE: Config = {
  link: 'customScheme', payload: 'token', pkce: false, singleUse: false, stateParam: false,
};

export const SHIPPED: Config = {
  link: 'universalLink', payload: 'code', pkce: true, singleUse: true, stateParam: true,
};

export type AttackId = 'scheme-hijack' | 'token-in-logs' | 'code-replay' | 'code-interception' | 'csrf';

export interface Attack {
  id: AttackId;
  /** Whether this configuration lets the attack through. */
  lands: boolean;
}

/**
 * Run all five attacks against a configuration.
 *
 * Order matters for reading: the first two are about the channel, the last
 * three about what travels on it.
 */
export function attack(c: Config): Attack[] {
  return [
    // Any app can claim a custom scheme. Only the domain owner can claim a
    // universal link, because the app has to be listed in its AASA file.
    { id: 'scheme-hijack', lands: c.link === 'customScheme' },

    // A token on a query string ends up in logs and history. A code does too,
    // and does not matter, because by then it has been spent.
    { id: 'token-in-logs', lands: c.payload === 'token' },

    // A code that can be presented twice is a token with extra steps.
    { id: 'code-replay', lands: c.payload === 'code' && !c.singleUse },

    // Without PKCE, whoever holds the code can exchange it — including whoever
    // intercepted it on the way back.
    { id: 'code-interception', lands: c.payload === 'code' && !c.pkce },

    // Without state, a callback the user never started is accepted.
    { id: 'csrf', lands: !c.stateParam },
  ];
}

export const landed = (c: Config): AttackId[] => attack(c).filter((a) => a.lands).map((a) => a.id);
export const isSafe = (c: Config): boolean => landed(c).length === 0;

/** The steps a redirect takes, so the chapter can show where each attack sits. */
export interface Step { id: string; attack: AttackId | null }

export function flow(c: Config): Step[] {
  return [
    { id: 'open', attack: null },
    { id: 'authorise', attack: 'csrf' },
    { id: 'redirect', attack: c.link === 'customScheme' ? 'scheme-hijack' : null },
    { id: 'receive', attack: c.payload === 'token' ? 'token-in-logs' : null },
    { id: 'exchange', attack: c.payload === 'code' && !c.pkce ? 'code-interception' : null },
    { id: 'reuse', attack: c.payload === 'code' && !c.singleUse ? 'code-replay' : null },
    { id: 'session', attack: null },
  ];
}

/** How far a redirect gets before the first attack that lands stops it. */
export function reached(c: Config): number {
  const steps = flow(c);
  const bad = steps.findIndex((s) => s.attack !== null && landed(c).includes(s.attack));
  return bad === -1 ? steps.length : bad;
}
