import type { SmallMultiplesGroupPanel } from './facetDataByGroup';

/**
 * Shared ordinal domain for pie-panel slice categories (`row.x`).
 * First-seen order across panels, optionally reordered by `legend.categories`.
 * @param panels
 * @param legendCategories
 */
export function resolveSliceDomain(
	panels: SmallMultiplesGroupPanel[] | null | undefined,
	legendCategories?: (string | number)[] | null
): string[] {
	if (!Array.isArray(panels) || panels.length === 0) {
		return [];
	}

	const seen = new Set<string>();
	const fromData: string[] = [];
	for (const panel of panels) {
		for (const series of panel.series) {
			for (const row of series.rows) {
				const key = String(row.x);
				if (!seen.has(key)) {
					seen.add(key);
					fromData.push(key);
				}
			}
		}
	}

	if (!Array.isArray(legendCategories) || legendCategories.length === 0) {
		return fromData;
	}

	const ordered = legendCategories.map(String).filter((key) => seen.has(key));
	const rest = fromData.filter((key) => !ordered.includes(key));
	return [...ordered, ...rest];
}
