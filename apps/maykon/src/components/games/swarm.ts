/**
 * A small, deliberately honest model of a horizontally scaled HTTP service.
 *
 * Nothing here is calibrated to a real cluster — the point is that the shapes
 * are right: latency does not degrade linearly, it hangs a cliff near
 * saturation; and capacity does not appear the moment you ask for it.
 */

/** Requests per second one replica can serve. */
export const CAPACITY_PER_POD = 60;
/** Latency of an idle service, in milliseconds. */
export const BASE_LATENCY = 28;
export const MIN_REPLICAS = 1;
export const MAX_REPLICAS = 20;
/** What a replica costs to run for a month, in US dollars. */
export const COST_PER_POD = 17;
/** How long a new pod takes to accept traffic, in seconds. */
export const POD_STARTUP = 4;
/** Saturation the autoscaler aims to hold. */
export const HPA_TARGET = 0.6;
/** Seconds the autoscaler waits before scaling *down*, as real HPAs do. */
export const SCALE_DOWN_DELAY = 6;

export const CYCLE = 36;

/**
 * Traffic for a point in the cycle: a calm baseline with a gaussian spike, so
 * the ramp is fast enough to outrun a cold start but smooth enough to chase.
 */
export function trafficAt(t: number): number {
  const x = ((t % CYCLE) + CYCLE) % CYCLE;
  const baseline = 110 + 25 * Math.sin(x * 0.9);
  const spike = 560 * Math.exp(-((x - 18) ** 2) / (2 * 3.2 ** 2));
  return Math.max(0, baseline + spike);
}

export const capacityOf = (readyPods: number) => readyPods * CAPACITY_PER_POD;

/** Offered load over capacity. Above 1 the service is turning requests away. */
export function saturation(rps: number, readyPods: number): number {
  const cap = capacityOf(readyPods);
  return cap === 0 ? Infinity : rps / cap;
}

/**
 * Queueing latency. Below saturation this is the standard 1/(1-rho) blow-up;
 * at or above it, everything that does get served is already at the ceiling.
 */
export function latencyOf(rho: number): number {
  if (!Number.isFinite(rho) || rho >= 1) return 2000;
  return Math.min(2000, BASE_LATENCY / (1 - Math.min(rho, 0.985)));
}

/** Requests per second that cannot be served at all. */
export function droppedRps(rps: number, readyPods: number): number {
  return Math.max(0, rps - capacityOf(readyPods));
}

/**
 * The Kubernetes HPA formula:
 *   desired = ceil(current * currentMetric / targetMetric)
 * which, for a saturation metric, reduces to sizing straight off the load.
 */
export function desiredReplicas(rps: number, target = HPA_TARGET): number {
  const desired = Math.ceil(rps / (CAPACITY_PER_POD * target));
  return Math.min(MAX_REPLICAS, Math.max(MIN_REPLICAS, desired));
}

export const monthlyCost = (replicas: number) => replicas * COST_PER_POD;

export type Health = 'healthy' | 'strained' | 'failing' | 'wasteful';

export function healthOf(rho: number): Health {
  if (rho >= 1) return 'failing';
  if (rho >= 0.8) return 'strained';
  if (rho < 0.2) return 'wasteful';
  return 'healthy';
}
