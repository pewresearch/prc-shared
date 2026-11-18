export type OrderRowsOptions<T> = {
	getValue: (row: T) => number;
	/** 'ascending' or 'descending' sorts by value. Anything else keeps the incoming (table) order. */
	sortOrder?: string | null;
};

/**
 * Order part-to-whole rows (hemicycle parties) by value.
 *
 * Without a value sort, rows keep the order they came in, which is the data table order.
 *
 * @param rows              Rows to order. Not changed.
 * @param options           How to order them.
 * @param options.getValue  Numeric value of a row.
 * @param options.sortOrder 'ascending' or 'descending' for a value sort.
 * @return A new array.
 */
export function orderRows<T>(
	rows: T[],
	{ getValue, sortOrder }: OrderRowsOptions<T>
): T[] {
	const ordered = [...rows];
	if (sortOrder === 'ascending') {
		return ordered.sort((a, b) => getValue(a) - getValue(b));
	}
	if (sortOrder === 'descending') {
		return ordered.sort((a, b) => getValue(b) - getValue(a));
	}
	return ordered;
}
