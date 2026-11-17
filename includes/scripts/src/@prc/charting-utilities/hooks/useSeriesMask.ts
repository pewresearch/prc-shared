import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChartLayoutType } from '../types/layout';
import {
	EMPTY_HIDDEN,
	createSeriesMaskView,
	isSeriesMaskArmed,
	toggleHiddenWithGroups,
	type SeriesMaskView,
} from '../utilities/seriesMask';

const EMPTY_HIDE_GROUPS: readonly (readonly string[])[] = [];

export type UseSeriesMaskInput = {
	chartId?: string;
	chartType: ChartLayoutType;
	clickToHide: boolean | undefined;
	clickToHideGroups?: readonly (readonly string[])[];
	isEditor: boolean;
	/** Store-backed hide keys (frontend). Omit in the editor. */
	hiddenSeries?: readonly string[];
	/** Store writer (frontend). Omit in the editor. */
	onToggle?: (key: string) => void;
};

/**
 * Stable revision from store-backed hide keys so tooltips dismiss on change.
 *
 * @param keys Hidden series keys.
 * @return Revision number.
 */
function revisionFromHiddenKeys(keys: readonly string[]): number {
	return keys.reduce((sum, key) => sum + key.length, keys.length);
}

export function useSeriesMask(input: UseSeriesMaskInput): SeriesMaskView {
	const armed = isSeriesMaskArmed(input);
	const groups = input.clickToHideGroups ?? EMPTY_HIDE_GROUPS;
	const storeBacked = typeof input.onToggle === 'function';
	const [localHidden, setLocalHidden] =
		useState<ReadonlySet<string>>(EMPTY_HIDDEN);
	const [localRevision, setLocalRevision] = useState(0);

	useEffect(() => {
		setLocalHidden(EMPTY_HIDDEN);
		setLocalRevision(0);
	}, [input.chartId]);

	useEffect(() => {
		if (!armed) {
			setLocalHidden(EMPTY_HIDDEN);
		}
	}, [armed]);

	const hidden = useMemo(() => {
		if (storeBacked) {
			const keys = input.hiddenSeries ?? [];
			return keys.length === 0 ? EMPTY_HIDDEN : new Set(keys);
		}
		return localHidden;
	}, [storeBacked, input.hiddenSeries, localHidden]);

	const revision = storeBacked
		? revisionFromHiddenKeys(input.hiddenSeries ?? [])
		: localRevision;

	const onToggle = input.onToggle;
	const toggle = useCallback(
		(key: string) => {
			if (onToggle) {
				onToggle(key);
				return;
			}
			setLocalHidden((prev) => toggleHiddenWithGroups(prev, key, groups));
			setLocalRevision((value) => value + 1);
		},
		[groups, onToggle]
	);

	return useMemo(
		() => createSeriesMaskView({ armed, hidden, toggle, revision }),
		[armed, hidden, toggle, revision]
	);
}

/**
 * Close an open tooltip when a legend click changes the hide set.
 * A hidden mark may unmount before mouseleave fires.
 *
 * @param view        Series mask view from chart context.
 * @param hideTooltip Tooltip closer from the chart.
 */
export function useDismissTooltipOnSeriesMask(
	view: SeriesMaskView,
	hideTooltip: () => void
): void {
	useEffect(() => {
		if (view.armed && view.revision > 0) {
			hideTooltip();
		}
	}, [view.armed, view.revision, hideTooltip]);
}
