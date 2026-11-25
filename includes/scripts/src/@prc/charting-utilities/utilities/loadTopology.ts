import { createSuspenseResource } from './suspenseResource';

/**
 * Creates a Suspense-compatible topology loader for a given topology file path.
 * Compatible with React 18.3+. Can use React 19's use() hook in the future.
 *
 * A failed import stays failed until `retryFailedResources()` runs (the chart
 * error boundary calls it on reset); then the next read imports again.
 *
 * @param importFn - A function that returns a Promise for the topology module import
 * @return A loader function that works with React Suspense
 *
 * @example
 * ```ts
 * const loadUSATopology = createTopologyLoader(
 *   () => import('../../maps/usa/topology.json')
 * );
 *
 * function MyComponent() {
 *   const topology = loadUSATopology();
 *   // Use topology data...
 * }
 * ```
 */
export function createTopologyLoader(importFn: () => Promise<any>) {
	const resource = createSuspenseResource(importFn);
	return function loadTopology() {
		return resource.read();
	};
}
