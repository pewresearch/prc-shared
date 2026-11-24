import type { FlatData } from '../types/flatData';

export type HeatMapTableCell = {
	rowIndex: number;
	colIndex: number;
	rowKey: string;
	columnKey: string;
	/** Text values feed ordinal scales. */
	value: number | string | null;
	dataPoint: FlatData;
};

export type ComputeHeatMapTableCellsArgs = {
	rows: FlatData[];
	columns: string[];
	/** FlatData key for the row label (usually `x`). */
	rowKeyField?: string;
};

export type ComputeHeatMapTableCellsResult = {
	rowKeys: string[];
	columns: string[];
	cells: HeatMapTableCell[];
};

function parseCellValue(raw: unknown): number | string | null {
	if (raw === null || raw === undefined || raw === '') {
		return null;
	}
	if (typeof raw === 'boolean') {
		return null;
	}
	const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
	if (Number.isFinite(n)) {
		return n;
	}
	return typeof raw === 'string' ? raw : null;
}

/**
 * Flatten row × column table data into one cell descriptor per intersection.
 * Each cell carries a FlatData point shaped for tooltips / shape overrides:
 * `{ x: rowLabel, category: columnKey, y: value, [columnKey]: value }`.
 *
 * @param root0             Cell arguments.
 * @param root0.rows        Table rows.
 * @param root0.columns     Value columns, in display order.
 * @param root0.rowKeyField FlatData key for the row label.
 */
export function computeHeatMapTableCells({
	rows,
	columns,
	rowKeyField = 'x',
}: ComputeHeatMapTableCellsArgs): ComputeHeatMapTableCellsResult {
	const safeColumns = (columns || []).map(String).filter(Boolean);
	const rowKeys: string[] = [];
	const cells: HeatMapTableCell[] = [];

	rows.forEach((row, rowIndex) => {
		const rowKey = String(row[rowKeyField] ?? row.x ?? '');
		rowKeys.push(rowKey);

		safeColumns.forEach((columnKey, colIndex) => {
			const value = parseCellValue(row[columnKey]);
			const dataPoint: FlatData = {
				...row,
				x: rowKey,
				category: columnKey,
				y: typeof value === 'number' ? value : undefined,
				[columnKey]: value ?? row[columnKey],
			};
			cells.push({
				rowIndex,
				colIndex,
				rowKey,
				columnKey,
				value,
				dataPoint,
			});
		});
	});

	return { rowKeys, columns: safeColumns, cells };
}
