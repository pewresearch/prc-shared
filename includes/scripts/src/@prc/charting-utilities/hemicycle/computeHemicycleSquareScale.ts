import type { HemicycleSeat } from './computeHemicycleSeats';

type Point = [number, number];

/**
 * Corners of a seat's square, turned by the seat rotation.
 *
 * @param seat     Seat to draw.
 * @param halfSide Half the square's side length.
 */
function getSquareCorners(seat: HemicycleSeat, halfSide: number): Point[] {
	const turn = (seat.rotation * Math.PI) / 180;
	const cos = Math.cos(turn);
	const sin = Math.sin(turn);
	return (
		[
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1],
		] as Point[]
	).map(([cx, cy]) => [
		seat.x + (cx * cos - cy * sin) * halfSide,
		seat.y + (cx * sin + cy * cos) * halfSide,
	]);
}

/**
 * Separating-axis test: true when two convex quads share interior area.
 *
 * @param a First quad.
 * @param b Second quad.
 */
function squaresOverlap(a: Point[], b: Point[]): boolean {
	const axes = [a, b].flatMap((quad) =>
		quad.map(([x, y], i) => {
			const [nextX, nextY] = quad[(i + 1) % quad.length];
			return [-(nextY - y), nextX - x];
		})
	);
	return axes.every(([ax, ay]) => {
		const project = (quad: Point[]) =>
			quad.map(([x, y]) => x * ax + y * ay);
		const projectedA = project(a);
		const projectedB = project(b);
		return (
			Math.max(...projectedA) - 1e-9 > Math.min(...projectedB) &&
			Math.max(...projectedB) - 1e-9 > Math.min(...projectedA)
		);
	});
}

/**
 * Largest scale (0.707–1) for square seats of half side `seatRadius * scale`
 * so no two rotated squares overlap.
 *
 * Seat centers sit at least one seat diameter apart, so circles never touch.
 * A square of the same width can reach into a diagonal neighbor. A square
 * inscribed in the circle (scale 1/√2) never overlaps, so it bounds the search.
 *
 * @param seats      Seats from computeHemicycleSeats.
 * @param seatRadius Seat radius in unit-hemicycle space.
 */
export function computeHemicycleSquareScale(
	seats: HemicycleSeat[],
	seatRadius: number
): number {
	if (seats.length < 2 || seatRadius <= 0) {
		return 1;
	}

	// A square reaches at most seatRadius * √2 from its center, so only seats
	// closer than twice that can touch.
	const reach = 2 * Math.SQRT2 * seatRadius;
	const pairs: Array<[number, number]> = [];
	for (let i = 0; i < seats.length; i += 1) {
		for (let j = i + 1; j < seats.length; j += 1) {
			if (
				Math.hypot(seats[i].x - seats[j].x, seats[i].y - seats[j].y) <
				reach
			) {
				pairs.push([i, j]);
			}
		}
	}

	const collides = (scale: number) => {
		const corners = new Map<number, Point[]>();
		const cornersOf = (index: number) => {
			if (!corners.has(index)) {
				corners.set(
					index,
					getSquareCorners(seats[index], seatRadius * scale)
				);
			}
			return corners.get(index)!;
		};
		return pairs.some(([i, j]) =>
			squaresOverlap(cornersOf(i), cornersOf(j))
		);
	};

	if (!collides(1)) {
		return 1;
	}

	let safe = Math.SQRT1_2;
	let unsafe = 1;
	for (let step = 0; step < 14; step += 1) {
		const mid = (safe + unsafe) / 2;
		if (collides(mid)) {
			unsafe = mid;
		} else {
			safe = mid;
		}
	}
	return safe;
}
