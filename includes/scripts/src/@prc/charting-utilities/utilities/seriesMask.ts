import type { ChartLayoutType } from '../types/layout';

export const HIDDEN_LEGEND_ITEM_OPACITY = 0.2 as const;

export const SERIES_MASK_CHART_TYPES: readonly ChartLayoutType[] = [
	'diverging-bar',
	'scatter',
	'bar',
	'stacked-bar',
	'exploded-bar',
	'line',
	'area',
	'stacked-area',
	'pie',
	'waffle',
	'treemap',
	'dot-plot',
	'radar',
	'bee-swarm',
];

export const EMPTY_HIDDEN: ReadonlySet<string> = new Set();

export function categoryKeyFromLegendDatum(datum: unknown): string {
	return String(datum);
}

export function chartTypeSupportsSeriesMask(
	chartType: ChartLayoutType
): boolean {
	return (SERIES_MASK_CHART_TYPES as readonly string[]).includes(chartType);
}

export function isSeriesMaskArmed(input: {
	clickToHide: boolean | undefined;
	chartType: ChartLayoutType;
	isEditor: boolean;
}): boolean {
	return (
		input.isEditor === false &&
		input.clickToHide === true &&
		chartTypeSupportsSeriesMask(input.chartType)
	);
}

/**
 * Keys affected by a legend click (whole group or the single key).
 *
 * @param key    Legend datum / series key that was clicked.
 * @param groups Optional legend click-to-hide groups from config.
 */
export function keysForLegendHideToggle(
	key: string,
	groups: readonly (readonly string[])[] = []
): readonly string[] {
	for (const group of groups) {
		if (group.some((member) => member === key)) {
			return group;
		}
	}
	return [key];
}

/**
 * Toggle hide state for a legend click, expanding to clickToHideGroups when matched.
 * If every key in the group is already hidden, show them all; otherwise hide them all.
 *
 * @param hidden Current hidden series keys.
 * @param key    Legend datum / series key that was clicked.
 * @param groups Optional legend click-to-hide groups from config.
 */
export function toggleHiddenWithGroups(
	hidden: ReadonlySet<string>,
	key: string,
	groups: readonly (readonly string[])[] = []
): ReadonlySet<string> {
	const targets = keysForLegendHideToggle(key, groups);
	const allHidden = targets.every((k) => hidden.has(k));
	const next = new Set(hidden);
	if (allHidden) {
		for (const k of targets) {
			next.delete(k);
		}
	} else {
		for (const k of targets) {
			next.add(k);
		}
	}
	return next.size === 0 ? EMPTY_HIDDEN : next;
}

/**
 * Hide identity for a mark: group-break column value when set, else series category.
 *
 * @param input             Mark context.
 * @param input.category    Series category column name (wide data).
 * @param input.row         Data row for the mark.
 * @param input.groupColumn Group-breaks column name, if any.
 */
export function markHideKey(input: {
	category: string;
	row?: Record<string, unknown>;
	groupColumn?: string | null;
}): string {
	if (input.groupColumn && input.row) {
		return String(input.row[input.groupColumn] ?? '');
	}
	return input.category;
}

function legendItemOpacity(
	key: string,
	hidden: ReadonlySet<string>
): 1 | typeof HIDDEN_LEGEND_ITEM_OPACITY {
	return hidden.has(key) ? HIDDEN_LEGEND_ITEM_OPACITY : 1;
}

export type SeriesMaskView = {
	armed: boolean;
	isHidden: (key: string) => boolean;
	legendOpacity: (key: string) => 1 | typeof HIDDEN_LEGEND_ITEM_OPACITY;
	/**
	 * Series keys that stay on the plot. Same array when the mask is off or
	 * nothing is hidden, so scale memos do not rebuild.
	 */
	filterKeys: <T extends string>(keys: readonly T[]) => readonly T[];
	toggle: (key: string) => void;
	/** Increments when the hide set changes (armed charts only). */
	revision: number;
};

export const INERT_SERIES_MASK: SeriesMaskView = {
	armed: false,
	isHidden: () => false,
	legendOpacity: () => 1,
	filterKeys: (keys) => keys,
	toggle: () => undefined,
	revision: 0,
};

/**
 * Whether an open tooltip should be suppressed because its series keys are hidden.
 *
 * @param view                  Series mask view from chart context.
 * @param input                 Tooltip payload hints.
 * @param input.tooltipMode     Tooltip mode; `'row'` checks all listed category keys.
 * @param input.category        Series category for a single-bar tooltip.
 * @param input.rowCategoryKeys Category keys in a row tooltip body.
 * @param input.markHideKey     Scatter hide identity, when already computed.
 */
export function seriesMaskShouldHideTooltip(
	view: SeriesMaskView,
	input: {
		tooltipMode?: string;
		category?: string | null;
		rowCategoryKeys?: readonly string[];
		markHideKey?: string;
	}
): boolean {
	if (!view.armed) {
		return false;
	}
	if (input.markHideKey !== undefined) {
		return view.isHidden(input.markHideKey);
	}
	if (input.tooltipMode === 'row') {
		const keys = input.rowCategoryKeys ?? [];
		if (keys.length === 0) {
			return false;
		}
		return keys.every((cat) => view.isHidden(cat));
	}
	return view.isHidden(input.category || '');
}

export function createSeriesMaskView(input: {
	armed: boolean;
	hidden: ReadonlySet<string>;
	toggle: (key: string) => void;
	revision?: number;
}): SeriesMaskView {
	if (!input.armed) {
		return INERT_SERIES_MASK;
	}
	return {
		armed: true,
		isHidden: (key) => input.hidden.has(key),
		legendOpacity: (key) => legendItemOpacity(key, input.hidden),
		filterKeys: (keys) => {
			if (keys.length === 0 || input.hidden.size === 0) {
				return keys;
			}
			const next = keys.filter((key) => !input.hidden.has(key));
			return next.length === keys.length ? keys : next;
		},
		toggle: input.toggle,
		revision: input.revision ?? 0,
	};
}
