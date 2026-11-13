import type { PlotBands } from '../types/plotBands';

export type PlotBandLabelStyle = PlotBands['bands'][number]['style']['label'];

/**
 * Degrees clockwise for a plot band label.
 * A stored rotation wins, including 0.
 * A legacy vertical orientation with no rotation reads as 90.
 *
 * @param label Plot band label style.
 * @return Rotation in degrees.
 */
export function readPlotBandLabelRotation(
	label: PlotBandLabelStyle | undefined
): number {
	if (
		typeof label?.rotation === 'number' &&
		Number.isFinite(label.rotation)
	) {
		return label.rotation;
	}
	if (label?.orientation === 'vertical') {
		return 90;
	}
	return 0;
}
