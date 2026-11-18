export type HemicycleSeatShape = 'circle' | 'square';

export type HemicycleStackedBar = {
	/** Draw a stacked bar under the arcs with the same seat totals. */
	active: boolean;
	/** Bar height in px. */
	height: number;
	/** Space between the arcs and the bar in px. */
	gap: number;
};

export type Hemicycle = {
	seatShape: HemicycleSeatShape;
	/** Space between seats as a fraction of seat diameter (0–0.9). */
	seatGap: number;
	/** Number of semicircle rows. null picks the fewest rows that fit. */
	rows: number | null;
	/** Inner row radius as a fraction of the outer radius (0–0.9). */
	innerRadiusRatio: number;
	/** Seats in the chamber. null uses the sum of the party values. */
	totalSeats: number | null;
	/** Fill for seats beyond the party totals (vacancies). */
	emptyFill: string;
	stackedBar: HemicycleStackedBar;
};
