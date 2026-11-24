import type { FlatData } from '../types/flatData';

/**
 * Underscore-prefixed row fields are customization metadata, not series columns.
 * @param key
 */
export function isFacetMetaKey(key: string): boolean {
	return key.startsWith('__');
}

/**
 * Coerce a series cell to a plottable number. Matches `hasCategoryValue` /
 * `toFiniteNumber`: empty cells stay missing so they are not plotted as 0.
 * @param value
 */
export function parseFacetNumeric(value: unknown): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}

/**
 * Build a panel/series row from a wide or long-format source row.
 * Keeps tooltip/label customization bags so labels, tooltips, and editor
 * popovers can resolve against the series category key.
 * @param row
 * @param seriesKey
 */
export function enrichFacetRow(row: FlatData, seriesKey: string): FlatData {
	const y = parseFacetNumeric(row[seriesKey]);
	const enriched: FlatData = {
		x: row.x,
		y: y ?? undefined,
		[seriesKey]: y ?? undefined,
	};

	for (const key of Object.keys(row)) {
		if (isFacetMetaKey(key)) {
			enriched[key] = row[key];
		}
	}

	return enriched;
}
