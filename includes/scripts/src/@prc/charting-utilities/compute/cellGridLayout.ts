export type ComputeWaffleLayoutArgs = {
	columns: number;
	rows: number;
	cellSize: number;
	cellGap: number;
};

export type WaffleLayout = {
	cellSize: number;
	cellGap: number;
	width: number;
	height: number;
	position: (col: number, row: number) => { x: number; y: number };
};

/**
 * Fixed cell-size layout so changing columns/rows keeps visual scale persistent.
 * `cellGap` is a fraction of cellSize (padding between cells).
 * @param root0
 * @param root0.columns
 * @param root0.rows
 * @param root0.cellSize
 * @param root0.cellGap
 */
export function computeWaffleLayout({
	columns,
	rows,
	cellSize,
	cellGap,
}: ComputeWaffleLayoutArgs): WaffleLayout {
	const size = Math.max(1, Number(cellSize) || 12);
	const gapFraction = Math.max(0, Math.min(0.5, Number(cellGap) || 0));
	const gapPx = size * gapFraction;
	const step = size + gapPx;
	const width = columns * size + Math.max(0, columns - 1) * gapPx;
	const height = rows * size + Math.max(0, rows - 1) * gapPx;

	return {
		cellSize: size,
		cellGap: gapFraction,
		width,
		height,
		position: (col: number, row: number) => ({
			x: col * step,
			y: row * step,
		}),
	};
}
