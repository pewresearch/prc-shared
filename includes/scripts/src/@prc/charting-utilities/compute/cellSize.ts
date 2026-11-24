import type { WaffleCellSizeMode } from '../types/waffle';

export type ResolveWaffleCellSizeArgs = {
	mode?: WaffleCellSizeMode | null;
	/** Authored preferred size in px. */
	cellSize?: number | null;
	columns: number;
	rows: number;
	cellGap?: number;
	availableWidth: number;
	availableHeight: number;
	/** Floor so cells never disappear on tiny containers. */
	minCellSize?: number;
};

/**
 * Span factor for N cells with fractional gap between them:
 * width = cellSize * (n + (n - 1) * gap)
 * @param count
 * @param cellGap
 */
export function waffleSpanFactor(count: number, cellGap: number): number {
	const n = Math.max(1, count);
	const gap = Math.max(0, Math.min(0.5, cellGap));
	return n + Math.max(0, n - 1) * gap;
}

/**
 * Largest square cell size that fits the grid in the available box.
 * @param root0
 * @param root0.columns
 * @param root0.rows
 * @param root0.cellGap
 * @param root0.availableWidth
 * @param root0.availableHeight
 * @param root0.minCellSize
 */
export function fitWaffleCellSize({
	columns,
	rows,
	cellGap = 0.1,
	availableWidth,
	availableHeight,
	minCellSize = 4,
}: {
	columns: number;
	rows: number;
	cellGap?: number;
	availableWidth: number;
	availableHeight: number;
	minCellSize?: number;
}): number {
	const widthFactor = waffleSpanFactor(columns, cellGap);
	const heightFactor = waffleSpanFactor(rows, cellGap);
	const widthFit =
		availableWidth > 0 && widthFactor > 0
			? availableWidth / widthFactor
			: minCellSize;
	const heightFit =
		availableHeight > 0 && heightFactor > 0
			? availableHeight / heightFactor
			: minCellSize;
	return Math.max(minCellSize, Math.min(widthFit, heightFit));
}

/**
 * Resolve the rendered cell size for fixed / auto / clamp modes.
 * @param root0
 * @param root0.mode
 * @param root0.cellSize
 * @param root0.columns
 * @param root0.rows
 * @param root0.cellGap
 * @param root0.availableWidth
 * @param root0.availableHeight
 * @param root0.minCellSize
 */
export function resolveWaffleCellSize({
	mode = 'clamp',
	cellSize = 14,
	columns,
	rows,
	cellGap = 0.1,
	availableWidth,
	availableHeight,
	minCellSize = 4,
}: ResolveWaffleCellSizeArgs): number {
	const preferred = Math.max(
		minCellSize,
		Number.isFinite(Number(cellSize)) && Number(cellSize) > 0
			? Number(cellSize)
			: 14
	);

	if (mode === 'fixed') {
		return preferred;
	}

	const fitted = fitWaffleCellSize({
		columns,
		rows,
		cellGap,
		availableWidth,
		availableHeight,
		minCellSize,
	});
	if (mode === 'auto') {
		return fitted;
	}
	// clamp: keep preferred size when it fits; otherwise scale down.
	return Math.min(preferred, fitted);
}
