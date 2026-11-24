export type PanelRect = {
	index: number;
	col: number;
	row: number;
	x: number;
	y: number;
	width: number;
	height: number;
	plotWidth: number;
	plotHeight: number;
	titlePad: number;
};

export type ComputePanelRectsArgs = {
	width: number;
	/** Locked cell height (title + plot). Total SVG height is derived from this. */
	panelHeight: number;
	panelCount: number;
	columns: number;
	gapX: number;
	gapY: number;
	titlePad: number;
};

export type ComputePanelRectsResult = {
	rects: PanelRect[];
	columns: number;
	rowCount: number;
	totalHeight: number;
};

export type ResolveEffectiveColumnsArgs = {
	columns: number;
	chartWidth: number;
	minPanelWidth?: number;
	gapX?: number;
};

export type ComputeGridHeightArgs = {
	rowCount: number;
	panelHeight: number;
	gapY: number;
};

/**
 * Clamp requested grid columns so each panel keeps at least `minPanelWidth`.
 * Used as a runtime restack when the container is narrower than the design width
 * (complements viewport attribute overrides like `mobile.smallMultiples.columns`).
 * @param root0
 * @param root0.columns
 * @param root0.chartWidth
 * @param root0.minPanelWidth
 * @param root0.gapX
 */
export function resolveEffectiveColumns({
	columns,
	chartWidth,
	minPanelWidth = 120,
	gapX = 0,
}: ResolveEffectiveColumnsArgs): number {
	const requested = Math.max(1, Math.floor(columns) || 1);
	if (!Number.isFinite(chartWidth) || chartWidth <= 0) {
		return requested;
	}

	let effective = requested;
	while (effective > 1) {
		const gaps = gapX * (effective - 1);
		const cellWidth = (chartWidth - gaps) / effective;
		if (cellWidth >= minPanelWidth) {
			break;
		}
		effective -= 1;
	}
	return effective;
}

/**
 * Total SVG/grid height from a locked panel height and the current row count.
 * @param root0
 * @param root0.rowCount
 * @param root0.panelHeight
 * @param root0.gapY
 */
export function computeGridHeight({
	rowCount,
	panelHeight,
	gapY,
}: ComputeGridHeightArgs): number {
	const rows = Math.max(0, Math.floor(rowCount) || 0);
	if (rows < 1) {
		return 0;
	}
	const cell = Math.max(0, panelHeight);
	const gap = Math.max(0, gapY);
	return rows * cell + (rows - 1) * gap;
}

/**
 * Compute cell + plot rects for a small-multiples panel grid.
 * Panel cell height is locked; total grid height grows/shrinks with rowCount.
 * @param root0
 * @param root0.width
 * @param root0.panelHeight
 * @param root0.panelCount
 * @param root0.columns
 * @param root0.gapX
 * @param root0.gapY
 * @param root0.titlePad
 */
export function computePanelRects({
	width,
	panelHeight,
	panelCount,
	columns,
	gapX,
	gapY,
	titlePad,
}: ComputePanelRectsArgs): ComputePanelRectsResult {
	const safeColumns = Math.max(1, Math.floor(columns) || 1);
	if (!panelCount || panelCount < 1) {
		return { rects: [], columns: safeColumns, rowCount: 0, totalHeight: 0 };
	}

	const rowCount = Math.ceil(panelCount / safeColumns);
	const cellWidth = (width - gapX * (safeColumns - 1)) / safeColumns;
	const cellHeight = Math.max(0, panelHeight);
	const totalHeight = computeGridHeight({
		rowCount,
		panelHeight: cellHeight,
		gapY,
	});
	const safeTitlePad = Math.max(0, titlePad);
	const plotWidth = Math.max(0, cellWidth);
	const plotHeight = Math.max(0, cellHeight - safeTitlePad);

	const rects: PanelRect[] = [];
	for (let index = 0; index < panelCount; index += 1) {
		const col = index % safeColumns;
		const row = Math.floor(index / safeColumns);
		rects.push({
			index,
			col,
			row,
			x: col * (cellWidth + gapX),
			y: row * (cellHeight + gapY),
			width: cellWidth,
			height: cellHeight,
			plotWidth,
			plotHeight,
			titlePad: safeTitlePad,
		});
	}

	return { rects, columns: safeColumns, rowCount, totalHeight };
}
