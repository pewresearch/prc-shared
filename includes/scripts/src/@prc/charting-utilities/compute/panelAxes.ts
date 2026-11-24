import type { SmallMultiplesAxisTreatment } from '../types/smallMultiples';

/** Alias of config `axisTreatment` — keep planner + theme schema in lockstep. */
export type AxisTreatment = SmallMultiplesAxisTreatment;

/**
 * vertical = line/column (value on left, category/time on bottom).
 *  horizontal = bar (category on left, value on bottom).
 */
export type PanelOrientation = 'vertical' | 'horizontal';

export type PlanPanelAxesArgs = {
	axisTreatment: AxisTreatment;
	col: number;
	/** Reserved for future sparse-label rules (e.g. first/last column only). */
	row?: number;
	columns?: number;
	rowCount?: number;
	dependentAxisActive: boolean;
	independentAxisActive: boolean;
	leftInset?: number;
	bottomInset?: number;
	orientation?: PanelOrientation;
};

export type PanelAxisPlan = {
	showDependentAxis: boolean;
	showIndependentAxis: boolean;
	showDependentGrid: boolean;
	showIndependentGrid: boolean;
	leftInset: number;
	bottomInset: number;
};

/**
 * Decide which axes/grids to render for one small-multiples panel.
 *
 * vertical (line/column):
 *   minimal — y ticks on first column; x ticks on every panel
 * horizontal (bar):
 *   minimal — category ticks on first column (shared labels); value ticks on every panel
 *
 * Insets are reserved whenever the axis that occupies that edge is active,
 * even when ticks are hidden, so plot fields align across the row.
 * @param root0
 * @param root0.axisTreatment
 * @param root0.col
 * @param root0.dependentAxisActive
 * @param root0.independentAxisActive
 * @param root0.leftInset
 * @param root0.bottomInset
 * @param root0.orientation
 */
export function planPanelAxes({
	axisTreatment,
	col,
	dependentAxisActive,
	independentAxisActive,
	leftInset = 32,
	bottomInset = 20,
	orientation = 'vertical',
}: PlanPanelAxesArgs): PanelAxisPlan {
	const isHorizontal = orientation === 'horizontal';

	// Which config axis draws on the left edge of the panel.
	const leftAxisActive = isHorizontal
		? independentAxisActive
		: dependentAxisActive;
	// Which config axis draws on the bottom edge.
	const bottomAxisActive = isHorizontal
		? dependentAxisActive
		: independentAxisActive;

	const showLeftTicks =
		leftAxisActive && (axisTreatment === 'full' || col === 0);
	const showBottomTicks = bottomAxisActive; // always when active (line/column x + bar values)

	const showDependentAxis = isHorizontal ? showBottomTicks : showLeftTicks;
	const showIndependentAxis = isHorizontal ? showLeftTicks : showBottomTicks;

	const showDependentGrid = dependentAxisActive;
	const showIndependentGrid =
		independentAxisActive && axisTreatment === 'full';

	return {
		showDependentAxis,
		showIndependentAxis,
		showDependentGrid,
		showIndependentGrid,
		leftInset: leftAxisActive ? leftInset : 0,
		bottomInset: bottomAxisActive ? bottomInset : 0,
	};
}
