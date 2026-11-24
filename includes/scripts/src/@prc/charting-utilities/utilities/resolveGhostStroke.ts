const DEFAULT_GHOST_STROKE = '#E6E7E8';

export type ResolveGhostStrokeArgs = {
	deselectedColor?: string | null;
	deselectedOpacity?: number | null;
	ghostStroke?: string | null;
	ghostOpacity?: number | null;
};

export type ResolvedGhostPaint = {
	stroke: string;
	opacity: number;
};

/**
 * Ghost sibling series should follow Colors → Deselected, not a hard-coded gray.
 * Falls back to smallMultiples.ghost.* then a library default.
 * @param root0
 * @param root0.deselectedColor
 * @param root0.deselectedOpacity
 * @param root0.ghostStroke
 * @param root0.ghostOpacity
 */
export function resolveGhostStroke({
	deselectedColor,
	deselectedOpacity,
	ghostStroke,
	ghostOpacity,
}: ResolveGhostStrokeArgs): ResolvedGhostPaint {
	const stroke =
		(typeof deselectedColor === 'string' && deselectedColor.length > 0
			? deselectedColor
			: null) ||
		(typeof ghostStroke === 'string' && ghostStroke.length > 0
			? ghostStroke
			: null) ||
		DEFAULT_GHOST_STROKE;

	let opacity = 1;
	if (
		typeof deselectedOpacity === 'number' &&
		Number.isFinite(deselectedOpacity)
	) {
		opacity = deselectedOpacity;
	} else if (
		typeof ghostOpacity === 'number' &&
		Number.isFinite(ghostOpacity)
	) {
		opacity = ghostOpacity;
	}

	return { stroke, opacity };
}
