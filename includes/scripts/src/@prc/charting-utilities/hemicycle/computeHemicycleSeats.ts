export type HemicycleCategoryInput = {
	key: string;
	value: number;
};

/**
 * One seat in a unit hemicycle: the outer row sits on radius 1, the
 * center of the arc is (0, 0), and y grows downward like SVG.
 */
export type HemicycleSeat = {
	index: number;
	row: number;
	x: number;
	y: number;
	/** Angle in radians: PI is the far left, 0 is the far right. */
	angle: number;
	/**
	 * Clockwise SVG rotation in degrees that turns a square seat so one side
	 * follows its row. Upright at the top, +90 at the far right, -90 at the far left.
	 */
	rotation: number;
	/** Index into the categories array, or -1 for a vacant seat. */
	categoryIndex: number;
	categoryKey: string | null;
};

export type ComputeHemicycleSeatsArgs = {
	categories: HemicycleCategoryInput[];
	/** Seats in the chamber. Defaults to the sum of category values. */
	totalSeats?: number | null;
	/** Number of semicircle rows. Defaults to the fewest rows that fit. */
	rows?: number | null;
	/** Inner row radius as a fraction of the outer radius (0–0.9). */
	innerRadiusRatio?: number;
};

export type ComputeHemicycleSeatsResult = {
	seats: HemicycleSeat[];
	rows: number;
	totalSeats: number;
	/** Seat radius in unit-hemicycle space, before any gap. */
	seatRadius: number;
	/** Seat counts per category, in category order. */
	counts: number[];
};

const MAX_ROWS = 100;

function getRowRadii(rows: number, innerRadiusRatio: number): number[] {
	const spacing = (1 - innerRadiusRatio) / rows;
	return Array.from(
		{ length: rows },
		(_, row) => 1 - spacing * (rows - 1 - row) - spacing / 2
	);
}

function getRowCapacity(rows: number, innerRadiusRatio: number): number {
	const spacing = (1 - innerRadiusRatio) / rows;
	return getRowRadii(rows, innerRadiusRatio).reduce(
		(sum, radius) =>
			sum + Math.max(1, Math.floor((Math.PI * radius) / spacing) + 1),
		0
	);
}

export function resolveHemicycleRows(
	totalSeats: number,
	innerRadiusRatio: number
): number {
	for (let rows = 1; rows < MAX_ROWS; rows += 1) {
		if (getRowCapacity(rows, innerRadiusRatio) >= totalSeats) {
			return rows;
		}
	}
	return MAX_ROWS;
}

/**
 * Splits seats across rows in proportion to each row's arc length, so seat
 * spacing stays even from the inner row to the outer row.
 *
 * @param totalSeats Seats to place.
 * @param radii      Row radii, inner row first.
 */
function distributeSeatsToRows(totalSeats: number, radii: number[]): number[] {
	const radiusSum = radii.reduce((sum, radius) => sum + radius, 0);
	const counts = radii.map((radius) =>
		Math.floor((totalSeats * radius) / radiusSum)
	);
	let remaining = totalSeats - counts.reduce((sum, count) => sum + count, 0);
	for (
		let row = radii.length - 1;
		remaining > 0;
		row = (row - 1 + radii.length) % radii.length
	) {
		counts[row] += 1;
		remaining -= 1;
	}
	return counts;
}

export function allocateHemicycleSeatCounts(
	categories: HemicycleCategoryInput[],
	totalSeats: number
): number[] {
	let remaining = totalSeats;
	return categories.map(({ value }) => {
		const count = Math.min(remaining, Math.max(0, Math.round(value)));
		remaining -= count;
		return count;
	});
}

export function computeHemicycleSeats({
	categories,
	totalSeats: totalSeatsArg = null,
	rows: rowsArg = null,
	innerRadiusRatio: innerRadiusRatioArg = 0.4,
}: ComputeHemicycleSeatsArgs): ComputeHemicycleSeatsResult {
	const valueSum = categories.reduce(
		(sum, { value }) => sum + Math.max(0, Math.round(value)),
		0
	);
	const totalSeats = Math.max(0, Math.round(totalSeatsArg ?? valueSum));

	if (totalSeats === 0) {
		return {
			seats: [],
			rows: 0,
			totalSeats,
			seatRadius: 0,
			counts: categories.map(() => 0),
		};
	}

	const innerRadiusRatio = Math.min(0.9, Math.max(0, innerRadiusRatioArg));
	const counts = allocateHemicycleSeatCounts(categories, totalSeats);

	const rows =
		rowsArg && rowsArg > 0
			? Math.min(MAX_ROWS, Math.round(rowsArg))
			: resolveHemicycleRows(totalSeats, innerRadiusRatio);
	const radii = getRowRadii(rows, innerRadiusRatio);
	const seatsPerRow = distributeSeatsToRows(totalSeats, radii);
	const spacing = (1 - innerRadiusRatio) / rows;

	const seatRadius = radii.reduce((smallest, radius, row) => {
		const perRow = seatsPerRow[row];
		if (perRow < 2) {
			return smallest;
		}
		const chord = 2 * radius * Math.sin(Math.PI / (2 * (perRow - 1)));
		return Math.min(smallest, chord / 2);
	}, spacing / 2);

	const positioned = radii.flatMap((radius, row) => {
		const perRow = seatsPerRow[row];
		return Array.from({ length: perRow }, (_, seat) => {
			const angle =
				perRow === 1
					? Math.PI / 2
					: Math.PI * (1 - seat / (perRow - 1));
			return {
				row,
				angle,
				rotation: 90 - (angle * 180) / Math.PI,
				x: radius * Math.cos(angle),
				y: -radius * Math.sin(angle),
			};
		});
	});

	// Fill seats left to right by angle, inner row first on ties, so each
	// party reads as one wedge of the hemicycle.
	positioned.sort((a, b) => b.angle - a.angle || a.row - b.row);

	const categoryBySeat: number[] = [];
	counts.forEach((count, categoryIndex) => {
		for (let i = 0; i < count; i += 1) {
			categoryBySeat.push(categoryIndex);
		}
	});

	const seats = positioned.map((seat, index) => {
		const categoryIndex = categoryBySeat[index] ?? -1;
		return {
			...seat,
			index,
			categoryIndex,
			categoryKey:
				categoryIndex >= 0 ? categories[categoryIndex].key : null,
		};
	});

	return { seats, rows, totalSeats, seatRadius, counts };
}
