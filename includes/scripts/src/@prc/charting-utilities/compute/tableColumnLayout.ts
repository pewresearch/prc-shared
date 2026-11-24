export type ComputeHeatMapTableLayoutArgs = {
	columnCount: number;
	availableWidth: number;
	cellGap?: number;
	minCellWidth?: number;
};

export type HeatMapTableLayout = {
	cellWidth: number;
	cellGap: number;
	gridWidth: number;
	/** Top-left of the colored cell at (col) with the given row Y. */
	cellPosition: (col: number, rowY: number) => { x: number; y: number };
};

/**
 * Fit the heat-map column grid into the chart's inner width.
 * Axis labels sit in layout padding, like other charts; row Y positions
 * come from the independent scale / group positioning in the chart component.
 *
 * @param root0                Layout arguments.
 * @param root0.columnCount    Number of value columns.
 * @param root0.availableWidth Inner chart width (px).
 * @param root0.cellGap        Gap between adjacent cells (px).
 * @param root0.minCellWidth   Minimum cell width (px).
 */
export function computeHeatMapTableLayout({
	columnCount,
	availableWidth,
	cellGap = 0,
	minCellWidth = 40,
}: ComputeHeatMapTableLayoutArgs): HeatMapTableLayout {
	const cols = Math.max(1, columnCount);
	const gap = Math.max(0, cellGap);
	const cellWidth = Math.max(
		minCellWidth,
		(Math.max(0, availableWidth) - gap * (cols - 1)) / cols
	);

	return {
		cellWidth,
		cellGap: gap,
		gridWidth: cols * cellWidth + (cols - 1) * gap,
		cellPosition: (col, rowY) => ({ x: col * (cellWidth + gap), y: rowY }),
	};
}
