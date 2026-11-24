import type { FlatData } from '../types/flatData';
import type { WaffleCategoryInput } from './cellGrid';

export function getWaffleCategoryInputs(
	flattenedData: FlatData[],
	valueKey: string,
	legendCategories?: (string | number)[] | null
): WaffleCategoryInput[] {
	const entries = flattenedData.map((row) => ({
		key: String(row.x),
		value: Number(row[valueKey]) || 0,
	}));

	if (!Array.isArray(legendCategories) || legendCategories.length === 0) {
		return entries;
	}

	const byKey = new Map(entries.map((entry) => [entry.key, entry]));
	const ordered = legendCategories
		.map(String)
		.filter((key) => byKey.has(key))
		.map((key) => byKey.get(key)!);
	const rest = entries.filter(
		(entry) =>
			!ordered.some((orderedEntry) => orderedEntry.key === entry.key)
	);
	return [...ordered, ...rest];
}
