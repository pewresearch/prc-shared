import type { FlatData } from '../types/flatData';
import type { DeclutterLabelInput, Labels } from '../types/labels';
import {
	getCustomLabel,
	getCustomLabelText,
	hasCategoryValue,
	isLabelVisible,
} from '../utilities/helpers';
import { getLabelFormat } from '../compute/labels';

import {
	buildChartLabelId,
	getLabelMaxWidth,
	hasAuthorLabelOverride,
} from './helpers';

/** Horizontal base offset (px) for `firstLastLabelLayout: 'outside'`. */
export const FIRST_LAST_OUTSIDE_BASE_DX = 5;

export function getLineLabelContent(
	d: FlatData,
	category: string,
	j: number,
	filteredDataLength: number,
	labels: Labels
): { content: string; defaultLabel: string } {
	const customLabelText = getCustomLabelText(d, category);
	const customLabel = getCustomLabel(d, category);
	const defaultLabel = getLabelFormat(d[category], category, labels, null, d);

	let content = '';
	if (customLabelText) {
		content = customLabelText;
	} else if (customLabel) {
		content = customLabel;
	} else if (
		labels.showFirstLastPointsOnly &&
		(j === 0 || j === filteredDataLength - 1)
	) {
		content = defaultLabel;
	} else if (!labels.showFirstLastPointsOnly) {
		content = defaultLabel;
	}

	return { content, defaultLabel };
}

/**
 * Resolve default dx/dy and textAnchor for a line-family point label.
 *
 * `default` uses base (0, 0). `outside` uses (-5, 0) for the first point and
 * (5, 0) for the last, with matching text anchors. A series with fewer than two
 * points has no first/last pair, so it keeps the base placement.
 * `labelPositionDX` / `labelPositionDY` always layer on top of that base.
 *
 * @param root0                    Placement inputs.
 * @param root0.pointIndex         Index of the point in its series.
 * @param root0.pointCount         Number of points in the series.
 * @param root0.labels             Label config.
 * @param root0.fallbackTextAnchor Text anchor to use before the config's.
 */
export function getFirstLastLabelPlacement({
	pointIndex,
	pointCount,
	labels,
	fallbackTextAnchor,
}: {
	pointIndex: number;
	pointCount: number;
	labels: Labels;
	fallbackTextAnchor?: DeclutterLabelInput['textAnchor'];
}): {
	defaultDx: number;
	defaultDy: number;
	textAnchor: NonNullable<DeclutterLabelInput['textAnchor']>;
} {
	const dx = labels.labelPositionDX ?? 0;
	const dy = labels.labelPositionDY ?? 0;
	const textAnchor =
		fallbackTextAnchor ?? labels.textAnchor ?? ('middle' as const);

	if (labels.firstLastLabelLayout !== 'outside' || pointCount < 2) {
		return { defaultDx: dx, defaultDy: dy, textAnchor };
	}

	const isFirst = pointIndex === 0;
	const isLast = pointIndex === pointCount - 1;

	if (isFirst) {
		return {
			defaultDx: -FIRST_LAST_OUTSIDE_BASE_DX + dx,
			defaultDy: dy,
			textAnchor: 'end',
		};
	}

	if (isLast) {
		return {
			defaultDx: FIRST_LAST_OUTSIDE_BASE_DX + dx,
			defaultDy: dy,
			textAnchor: 'start',
		};
	}

	return { defaultDx: dx, defaultDy: dy, textAnchor };
}

export function buildLineChartLabelInputs({
	categories,
	flattenedData,
	labels,
	labelProps,
	independentScale,
	dependentScale,
	getIndependentValue,
}: {
	categories: string[];
	flattenedData: FlatData[];
	labels: Labels;
	labelProps: Record<string, unknown>;
	independentScale: (value: any) => number;
	dependentScale: (value: any) => number;
	getIndependentValue: (d: FlatData) => any;
}): DeclutterLabelInput[] {
	const inputs: DeclutterLabelInput[] = [];

	categories.forEach((category, categoryIndex) => {
		const filteredData = flattenedData.filter((d: FlatData) =>
			hasCategoryValue(d, category)
		);

		filteredData.forEach((d, pointIndex) => {
			if (!isLabelVisible(d, category)) {
				return;
			}

			const { content } = getLineLabelContent(
				d,
				category,
				pointIndex,
				filteredData.length,
				labels
			);
			if (!content) {
				return;
			}

			const placement = getFirstLastLabelPlacement({
				pointIndex,
				pointCount: filteredData.length,
				labels,
				fallbackTextAnchor:
					(labelProps.textAnchor as DeclutterLabelInput['textAnchor']) ??
					labels.textAnchor,
			});

			const id = buildChartLabelId([
				'line',
				categoryIndex,
				category,
				d.x,
				pointIndex,
			]);
			inputs.push({
				id,
				category,
				x: independentScale(getIndependentValue(d)),
				y: dependentScale(d[category]),
				text: content,
				fontSize: labels.fontSize,
				fontFamily: labels.fontFamily,
				fontWeight: labels.fontWeight,
				maxWidth: getLabelMaxWidth(d, category),
				textAnchor: placement.textAnchor,
				dominantBaseline:
					(labelProps.dominantBaseline as DeclutterLabelInput['dominantBaseline']) ??
					'middle',
				defaultDx: placement.defaultDx,
				defaultDy: placement.defaultDy,
				locked: hasAuthorLabelOverride(d, category),
			});
		});
	});

	return inputs;
}

export function buildLineChartLabelId(
	categoryIndex: number,
	category: string,
	d: FlatData,
	pointIndex: number
): string {
	return buildChartLabelId([
		'line',
		categoryIndex,
		category,
		d.x,
		pointIndex,
	]);
}
