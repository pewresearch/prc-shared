import type { FlatData } from '../types/flatData';
import type { SmallMultiplesGroupPanel } from './facetDataByGroup';

/**
 * Order every panel series along the independent axis.
 *
 * Faceting keeps author row order, which is often newest first. Line panels
 * read position from the array — the path draws row to row, and first/last
 * label rules use the array index — so an unsorted panel draws its "first"
 * label against the rightmost point. `Line` sorts its flattened rows before
 * plotting; this is the faceted equivalent.
 *
 * Rows whose independent value is not finite (categorical panels, blank cells)
 * keep their author order.
 *
 * @param panels              Faceted panels to reorder.
 * @param getIndependentValue Resolves a row's position on the independent axis.
 * @return Panels with each series' rows in ascending independent order.
 */
export function sortPanelRowsByIndependent(
	panels: SmallMultiplesGroupPanel[],
	getIndependentValue: (row: FlatData) => number
): SmallMultiplesGroupPanel[] {
	return panels.map((panel) => ({
		...panel,
		series: panel.series.map((series) => ({
			...series,
			rows: sortRows(series.rows, getIndependentValue),
		})),
	}));
}

function sortRows(
	rows: FlatData[],
	getIndependentValue: (row: FlatData) => number
): FlatData[] {
	const indexed = rows.map((row, index) => ({
		row,
		index,
		value: getIndependentValue(row),
	}));

	if (indexed.some((entry) => !Number.isFinite(entry.value))) {
		return rows;
	}

	return indexed
		.sort((a, b) => a.value - b.value || a.index - b.index)
		.map((entry) => entry.row);
}
