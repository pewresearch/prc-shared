export type DivergingBar = {
	positiveCategories: string[];
	negativeCategories: string[];
	netPositiveCategory: string;
	netNegativeCategory: string;
	percentOfInnerWidth: number;
	neutralBar: {
		active: boolean;
		offsetX: number;
		separator: boolean;
		separatorOffsetX: number;
		separatorStroke: string;
		category: string;
	};
	zeroLine: {
		/** Empty string follows `dependentAxis.axis.stroke`. */
		stroke: string;
	};
	/**
	 * Optional translucent "ghost" overlay rendered on top of the primary
	 * diverging stack. Primary bars remain fully opaque; the ghost sits above
	 * with reduced opacity so the primary color shows through underneath, and
	 * the ghost stands alone where it extends past the primary bars.
	 *
	 * When inactive (default), the diverging bar renders exactly as before.
	 */
	secondary?: {
		active: boolean;
		/** Categories to render on the positive (right) side of the ghost stack. */
		positiveCategories: string[];
		/** Categories to render on the negative (left) side of the ghost stack. */
		negativeCategories: string[];
		/** Fill color for ghost bars. Set to null for transparent (stroke-only) bars. */
		fill: string | null;
		/** Stroke color for ghost bars. */
		stroke: string;
		/** Stroke width for ghost bars in px. */
		strokeWidth: number;
		/**
		 * Opacity of the ghost stack (0–1). Intentionally less than 1 so the
		 * primary color shows through where the two stacks overlap.
		 */
		opacity: number;
		/**
		 * Per-category style overrides. Each key is a category name; any field
		 * set here takes precedence over the global fill/stroke/strokeWidth/opacity.
		 */
		categoryStyles?: {
			[category: string]: {
				/** Per-category fill override. null = transparent (stroke-only). */
				fill?: string | null;
				stroke?: string;
				strokeWidth?: number;
				opacity?: number;
			};
		};
		/**
		 * When true, secondary categories are added to the chart legend with
		 * their resolved ghost fill color (per-category or global).
		 */
		showInLegend?: boolean;
	};
};
