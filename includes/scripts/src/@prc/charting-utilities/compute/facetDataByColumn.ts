import type { FlatData } from '../types/flatData';
import { hasCategoryValue } from '../utilities/helpers';
import { enrichFacetRow, isFacetMetaKey } from './enrichFacetRow';

/** Series style key every column-facet panel paints from; also its row label. */
export const SMALL_MULTIPLES_SHARED_SERIES_KEY = 'All panels';

export type SmallMultiplesPanel = {
	key: string;
	rows: FlatData[];
};

/** Keys that are not series columns when deriving panel categories. */
const RESERVED_KEYS = new Set([
	'x',
	'y',
	'y1',
	'y2',
	'y3',
	'y4',
	'category',
	'x__label',
	'y__label',
	'label',
	'tooltip',
	'isHighlighted',
]);

export function deriveCategories(data: FlatData[]): string[] {
	const first = data[0];
	if (!first || typeof first !== 'object') {
		return [];
	}
	return Object.keys(first).filter(
		(key) => !RESERVED_KEYS.has(key) && !isFacetMetaKey(key)
	);
}

/**
 * Facet wide-format chart rows into one panel series per data column.
 * Each panel key is a column header; each panel row carries `{ x, y }`, the
 * series value under its category key, and tooltip/label metadata bags.
 *
 * @param data       Wide-format chart rows.
 * @param categories Series columns to facet; derived from the rows when empty.
 * @return One panel per column.
 */
export function facetDataByColumn(
	data: FlatData[] | null | undefined,
	categories?: string[] | null
): SmallMultiplesPanel[] {
	if (!Array.isArray(data) || data.length === 0) {
		return [];
	}

	const keys =
		Array.isArray(categories) && categories.length > 0
			? categories
			: deriveCategories(data);

	return keys.map((key) => ({
		key,
		// Same as Line.tsx: drop empty cells, then connect remaining points.
		rows: data
			.filter((row) => hasCategoryValue(row, key))
			.map((row) => enrichFacetRow(row, key)),
	}));
}
