/**
 * A retryable Suspense resource: one lazy import (a map chunk, a topology
 * file) that render code reads synchronously.
 *
 *   idle --read--> pending --resolve--> fulfilled
 *                     |
 *                     +--reject--> rejected --retry--> idle
 *
 * Only `read` in `idle` starts an import, so concurrent readers share one
 * request. A read in `rejected` throws the error and does not retry: React
 * renders a failed tree again before it reaches the error boundary, so a
 * retry-on-read would loop. `retryFailedResources()` moves every rejected
 * resource back to `idle`; the chart error boundary calls it when it resets.
 *
 * Model: tests/prc-charting-library/formal/map-loading/MapLoading.tla.
 */

export type SuspenseResourceStatus =
	| 'idle'
	| 'pending'
	| 'fulfilled'
	| 'rejected';

export type SuspenseResourceEvent =
	| { type: 'read' }
	| { type: 'resolve' }
	| { type: 'reject' }
	| { type: 'retry' };

export function stepSuspenseResource(
	status: SuspenseResourceStatus,
	event: SuspenseResourceEvent
): SuspenseResourceStatus {
	switch (event.type) {
		case 'read':
			return status === 'idle' ? 'pending' : status;
		case 'resolve':
			return status === 'pending' ? 'fulfilled' : status;
		case 'reject':
			return status === 'pending' ? 'rejected' : status;
		case 'retry':
			return status === 'rejected' ? 'idle' : status;
		default:
			return status;
	}
}

export interface SuspenseResource<T> {
	/** Returns the value, or throws the pending promise or the error. */
	read: () => T;
	status: () => SuspenseResourceStatus;
	/** Moves a rejected resource back to idle. Returns whether it did. */
	retry: () => boolean;
}

const registry = new Set<SuspenseResource<unknown>>();

export function createSuspenseResource<T>(
	importFn: () => Promise<T>
): SuspenseResource<T> {
	let status: SuspenseResourceStatus = 'idle';
	let value: T;
	let error: unknown;
	let promise: Promise<T> | undefined;

	const send = (event: SuspenseResourceEvent) => {
		const prev = status;
		status = stepSuspenseResource(status, event);
		return prev !== status;
	};

	const resource: SuspenseResource<T> = {
		read: () => {
			if (send({ type: 'read' })) {
				promise = importFn().then(
					(module) => {
						value = module;
						send({ type: 'resolve' });
						return module;
					},
					(reason) => {
						error = reason;
						send({ type: 'reject' });
						throw reason;
					}
				);
			}
			if (status === 'fulfilled') {
				return value;
			}
			if (status === 'rejected') {
				throw error;
			}
			throw promise;
		},
		status: () => status,
		retry: () => {
			if (!send({ type: 'retry' })) {
				return false;
			}
			error = undefined;
			promise = undefined;
			return true;
		},
	};

	registry.add(resource as SuspenseResource<unknown>);
	return resource;
}

/**
 * Moves every rejected resource back to idle, so the next render imports it
 * again. Returns how many it reset.
 */
export function retryFailedResources(): number {
	let count = 0;
	registry.forEach((resource) => {
		if (resource.retry()) {
			count += 1;
		}
	});
	return count;
}
