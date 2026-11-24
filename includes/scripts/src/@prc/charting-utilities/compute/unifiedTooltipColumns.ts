import { UnifiedColumn, UnifiedEntry } from '../types/unifiedTooltip';

export type BuildUnifiedTooltipColumnsOptions = {
	rows: any[];
	categories: string[];
	getX: (row: any) => any;
	toPixelX: (x: any) => number;
	/** Value to pixel y. Stacked charts pass the cumulative top instead. */
	toPixelY: (value: number, row: any, category: string) => number;
	getColor: (category: string, index: number) => string;
};

/**
 * Collect every series plotted at each x into a single column.
 *
 * @param options Rows, categories and the chart's pixel mappings.
 * @return One column per x that has at least one series plotted.
 */
export function buildUnifiedTooltipColumns(
	options: BuildUnifiedTooltipColumnsOptions
): UnifiedColumn[] {
	const { rows, categories, getX, toPixelX, toPixelY, getColor } = options;

	return rows
		.map((row) => {
			const entries: UnifiedEntry[] = [];

			categories.forEach((category, index) => {
				// Empty values coerce to 0, so they have to be rejected before
				// the cast. A real 0 is a value and must survive.
				const raw = row[category];
				if (null === raw || undefined === raw || '' === raw) {
					return;
				}
				const value = Number(raw);
				if (!Number.isFinite(value)) {
					return;
				}
				entries.push({
					category,
					value,
					py: toPixelY(value, row, category),
					color: getColor(category, index),
					sourceRow: row,
				});
			});

			const xValue = getX(row);
			const pixelYs = entries.map((entry) => entry.py);

			return {
				px: toPixelX(xValue),
				xValue,
				entries: entries.sort((a, b) => b.value - a.value),
				ruleTop: Math.min(...pixelYs),
				ruleBottom: Math.max(...pixelYs),
			};
		})
		.filter((column) => 0 < column.entries.length);
}

/**
 * Snap a pointer's pixel x to the column nearest it.
 *
 * There is no distance limit: the chart hides the tooltip when the pointer
 * leaves the plot, so inside the plot every position belongs to some column.
 *
 * @param columns Columns from `buildUnifiedTooltipColumns`.
 * @param px      Pointer x, plot-relative.
 * @return The nearest column, or null when there is nothing to snap to.
 */
export function findNearestColumn(
	columns: UnifiedColumn[],
	px: number
): UnifiedColumn | null {
	if (0 === columns.length || !Number.isFinite(px)) {
		return null;
	}

	// Strict `<` keeps the incumbent, so an exact tie resolves to the earlier
	// column rather than flickering on sub-pixel movement.
	return columns.reduce((nearest, column) =>
		Math.abs(column.px - px) < Math.abs(nearest.px - px) ? column : nearest
	);
}
