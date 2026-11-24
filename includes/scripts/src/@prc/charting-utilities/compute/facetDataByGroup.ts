import type { FlatData } from '../types/flatData';
import { hasCategoryValue } from '../utilities/helpers';
import { deriveCategories } from './facetDataByColumn';
import { enrichFacetRow } from './enrichFacetRow';

export type SmallMultiplesSeries = {
	key: string;
	rows: FlatData[];
};

export type SmallMultiplesGroupPanel = {
	key: string;
	series: SmallMultiplesSeries[];
};

/**
 * Facet long-format chart rows into one panel per group value
 * (e.g. `Country`), with one series per remaining data column.
 *
 * Complements `facetDataByColumn` (one panel per column, single series).
 * Panel order follows first appearance of each group value in the data.
 * @param data
 * @param groupKey
 * @param categories
 * @param groupOrder
 */
export function facetDataByGroup(
	data: FlatData[] | null | undefined,
	groupKey: string | null | undefined,
	categories?: string[] | null,
	groupOrder?: (string | number)[] | null
): SmallMultiplesGroupPanel[] {
	if (!Array.isArray(data) || data.length === 0 || !groupKey) {
		return [];
	}

	const seen = new Set<string>();
	let groupValues: string[] = [];
	for (const row of data) {
		const value = row[groupKey];
		if (value === undefined || value === null || value === '') {
			continue;
		}
		const key = String(value);
		if (!seen.has(key)) {
			seen.add(key);
			groupValues.push(key);
		}
	}
	if (!groupValues.length) {
		return [];
	}

	// Respect the editor's Group Order sorter (dataRender.groupBreaksCategoryValues);
	// group values not in the order list keep first-seen order at the end.
	if (Array.isArray(groupOrder) && groupOrder.length > 0) {
		const ordered = groupOrder.map(String).filter((key) => seen.has(key));
		const rest = groupValues.filter((key) => !ordered.includes(key));
		groupValues = [...ordered, ...rest];
	}

	const seriesKeys = (
		Array.isArray(categories) && categories.length > 0
			? categories
			: deriveCategories(data)
	).filter((key) => key !== groupKey);

	return groupValues.map((group) => {
		const groupRows = data.filter((row) => String(row[groupKey]) === group);
		return {
			key: group,
			series: seriesKeys.map((key) => ({
				key,
				rows: groupRows
					.filter((row) => hasCategoryValue(row, key))
					.map((row) => enrichFacetRow(row, key)),
			})),
		};
	});
}
