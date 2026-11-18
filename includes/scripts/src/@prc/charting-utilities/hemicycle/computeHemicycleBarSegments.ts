export type HemicycleBarSegment = {
	/** Index into the categories array, or -1 for vacant seats. */
	categoryIndex: number;
	count: number;
	/** Segment start as a fraction (0–1) of the bar width. */
	start: number;
	end: number;
};

/**
 * Stacked bar segments for the same seat counts the hemicycle draws, so the
 * bar and the dots always show identical totals.
 *
 * @param counts     Seat counts per category, in category order.
 * @param totalSeats Seats in the chamber; the remainder is vacant.
 */
export function computeHemicycleBarSegments(
	counts: number[],
	totalSeats: number
): HemicycleBarSegment[] {
	if (totalSeats <= 0) {
		return [];
	}
	const filled = counts.reduce((sum, count) => sum + count, 0);
	const entries = counts.map((count, categoryIndex) => ({
		categoryIndex,
		count,
	}));
	if (filled < totalSeats) {
		entries.push({ categoryIndex: -1, count: totalSeats - filled });
	}

	let cursor = 0;
	return entries
		.filter(({ count }) => count > 0)
		.map(({ categoryIndex, count }) => {
			const start = cursor / totalSeats;
			cursor += count;
			return { categoryIndex, count, start, end: cursor / totalSeats };
		});
}
