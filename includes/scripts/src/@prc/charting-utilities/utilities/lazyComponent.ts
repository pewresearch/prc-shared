import { createElement, type ComponentType } from 'react';
import { createSuspenseResource } from './suspenseResource';

/**
 * `React.lazy` with a retry: the chunk loads through a Suspense resource, so
 * after a failed import `retryFailedResources()` lets the next render load it
 * again. `React.lazy` keeps a failed chunk failed for the whole session.
 *
 * @param importFn - A dynamic import that resolves to a module with a default export
 */
export function createLazyComponent<P extends object>(
	importFn: () => Promise<{ default: ComponentType<P> }>
): ComponentType<P> {
	const resource = createSuspenseResource(importFn);
	function LazyComponent(props: P) {
		return createElement(resource.read().default, props);
	}
	return LazyComponent;
}
