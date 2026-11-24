export type WaffleDisplayMode = 'whole' | 'portion';

export type WaffleCategoryInput = {
	key: string;
	value: number;
};

export type WaffleCategoryMeta = {
	key: string;
	value: number;
	/** Share of the domain max, as a percentage (0–100+). */
	ratio: number;
	filledCells: number;
};

export type WaffleCell = {
	col: number;
	row: number;
	categoryIndex: number;
	categoryKey: string | null;
};

export type ComputeWaffleCellsArgs = {
	mode: WaffleDisplayMode;
	categories: WaffleCategoryInput[];
	columns?: number;
	rows?: number;
	/**
	 * Domain ceiling. Portion defaults to 100 when unset; whole defaults to the
	 * sum of category values (pie-like, no empty cells unless max exceeds sum).
	 */
	max?: number | null;
};

export type ComputeWaffleCellsResult = {
	categories: WaffleCategoryMeta[];
	cells: WaffleCell[];
	max: number;
	columns: number;
	rows: number;
	totalCells: number;
};

const DEFAULT_COLUMNS = 10;
const DEFAULT_ROWS = 10;

function resolveGridDimensions(columns?: number, rows?: number) {
	const cols =
		Number.isFinite(Number(columns)) && Number(columns) > 0
			? Math.round(Number(columns))
			: DEFAULT_COLUMNS;
	const rowCount =
		Number.isFinite(Number(rows)) && Number(rows) > 0
			? Math.round(Number(rows))
			: DEFAULT_ROWS;
	return { columns: cols, rows: rowCount, totalCells: cols * rowCount };
}

/**
 * Resolve the domain ceiling for fill semantics.
 * - Explicit positive max wins.
 * - Portion defaults to 100.
 * - Whole defaults to the sum of absolute values (pie parity).
 * @param mode
 * @param categories
 * @param max
 */
export function resolveWaffleMax(
	mode: WaffleDisplayMode,
	categories: WaffleCategoryInput[],
	max?: number | null
): number {
	if (max !== null && max !== undefined && Number(max) > 0) {
		return Number(max);
	}
	if (mode === 'portion') {
		return 100;
	}
	const sum = categories.reduce(
		(total, category) => total + Math.abs(Number(category.value) || 0),
		0
	);
	return sum > 0 ? sum : 1;
}

/**
 * Allocate cells from value/max against the grid capacity.
 * Sum of filled cells is ≤ totalCells; remainder stays empty.
 * @param categories
 * @param max
 * @param totalCells
 */
export function allocateWaffleCellCounts(
	categories: Array<{ key: string; value: number }>,
	max: number,
	totalCells: number
): WaffleCategoryMeta[] {
	if (categories.length === 0 || totalCells <= 0 || max <= 0) {
		return categories.map((category) => ({
			key: String(category.key),
			value: Number(category.value) || 0,
			ratio: 0,
			filledCells: 0,
		}));
	}

	const withFractions = categories.map((category) => {
		const value = Math.max(0, Number(category.value) || 0);
		const exact = (value / max) * totalCells;
		const base = Math.floor(exact);
		return {
			key: String(category.key),
			value,
			ratio: (value / max) * 100,
			filledCells: base,
			remainder: exact - base,
		};
	});

	const targetFilled = Math.min(
		totalCells,
		Math.max(
			0,
			Math.round(
				(withFractions.reduce(
					(sum, category) => sum + category.value,
					0
				) /
					max) *
					totalCells
			)
		)
	);

	const assigned = withFractions.reduce(
		(sum, category) => sum + category.filledCells,
		0
	);
	let remaining = targetFilled - assigned;

	const sortedByRemainder = [...withFractions].sort((a, b) => {
		if (b.remainder !== a.remainder) {
			return b.remainder - a.remainder;
		}
		return (
			categories.findIndex((c) => String(c.key) === a.key) -
			categories.findIndex((c) => String(c.key) === b.key)
		);
	});

	for (let i = 0; remaining > 0 && sortedByRemainder.length > 0; i += 1) {
		const target = sortedByRemainder[i % sortedByRemainder.length];
		target.filledCells += 1;
		remaining -= 1;
	}

	return withFractions.map(({ key, value, ratio, filledCells }) => ({
		key,
		value,
		ratio,
		filledCells,
	}));
}

function buildGridCoordinates(
	columns: number,
	rows: number
): Array<{ col: number; row: number }> {
	const coords: Array<{ col: number; row: number }> = [];
	for (let row = rows - 1; row >= 0; row -= 1) {
		for (let col = 0; col < columns; col += 1) {
			coords.push({ col, row });
		}
	}
	return coords;
}

function buildCellsFromQueue(
	categories: WaffleCategoryMeta[],
	columns: number,
	rows: number,
	totalCells: number
): WaffleCell[] {
	const coords = buildGridCoordinates(columns, rows);
	const categoryQueue: Array<{ categoryIndex: number; categoryKey: string }> =
		[];

	categories.forEach((category, categoryIndex) => {
		for (let i = 0; i < category.filledCells; i += 1) {
			categoryQueue.push({ categoryIndex, categoryKey: category.key });
		}
	});

	return coords.slice(0, totalCells).map(({ col, row }, index) => {
		const entry = categoryQueue[index];
		if (entry) {
			return {
				col,
				row,
				categoryIndex: entry.categoryIndex,
				categoryKey: entry.categoryKey,
			};
		}
		return {
			col,
			row,
			categoryIndex: -1,
			categoryKey: null,
		};
	});
}

export function computeWaffleCells({
	mode,
	categories,
	columns: columnsArg,
	rows: rowsArg,
	max: maxArg,
}: ComputeWaffleCellsArgs): ComputeWaffleCellsResult {
	const { columns, rows, totalCells } = resolveGridDimensions(
		columnsArg,
		rowsArg
	);
	const max = resolveWaffleMax(mode, categories, maxArg);

	if (mode === 'portion') {
		const categoryInput = categories[0] ?? { key: '', value: 0 };
		const allocated = allocateWaffleCellCounts(
			[categoryInput],
			max,
			totalCells
		);
		return {
			categories: allocated,
			cells: buildCellsFromQueue(allocated, columns, rows, totalCells),
			max,
			columns,
			rows,
			totalCells,
		};
	}

	const allocated = allocateWaffleCellCounts(categories, max, totalCells);
	return {
		categories: allocated,
		cells: buildCellsFromQueue(allocated, columns, rows, totalCells),
		max,
		columns,
		rows,
		totalCells,
	};
}
