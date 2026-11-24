import type { FlatData } from '../types/flatData';
import type { HemicycleCategoryInput } from './seatArcs';

/**
 * Tooltip value for one party: the seats drawn after the chamber cap, not the
 * raw table value. Later parties can lose seats when totalSeats is smaller
 * than the sum of party values.
 *
 * @param row        Data row for the hovered party. The row label is the party.
 * @param category   Value column key (for example "y").
 * @param categories Parties in the same order as counts.
 * @param counts     Drawn seats per party, from computeHemicycleSeats.
 */
export function hemicycleTooltipPoint(
	row: FlatData,
	category: string,
	categories: Pick<HemicycleCategoryInput, 'key'>[],
	counts: number[]
): { y: number; data: FlatData } {
	const index = categories.findIndex((entry) => entry.key === String(row.x));
	const drawn = index >= 0 ? (counts[index] ?? 0) : 0;
	return {
		y: drawn,
		data: { ...row, [category]: drawn },
	};
}
