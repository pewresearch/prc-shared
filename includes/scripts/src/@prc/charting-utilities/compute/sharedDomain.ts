import type { SmallMultiplesPanel } from './facetDataByColumn';

export type SharedDomainOptions = {
	/** When true, expand the domain to include 0 if it is not already present. */
	showZero?: boolean;
};

/**
 * Compute a shared linear y-domain across all small-multiples panels.
 * @param panels
 * @param options
 */
export function computeSharedDomain(
	panels: SmallMultiplesPanel[] | null | undefined,
	options: SharedDomainOptions = {}
): [number, number] {
	if (!Array.isArray(panels) || panels.length === 0) {
		return [0, 1];
	}

	let min = Infinity;
	let max = -Infinity;

	for (const panel of panels) {
		for (const row of panel.rows) {
			const value = row.y;
			if (typeof value !== 'number' || !Number.isFinite(value)) {
				continue;
			}
			if (value < min) {
				min = value;
			}
			if (value > max) {
				max = value;
			}
		}
	}

	if (!Number.isFinite(min) || !Number.isFinite(max)) {
		return [0, 1];
	}

	if (options.showZero) {
		min = Math.min(min, 0);
		max = Math.max(max, 0);
	}

	return [min, max];
}
