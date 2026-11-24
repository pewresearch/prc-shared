import { scaleLinear, scaleOrdinal, scaleThreshold } from '@visx/scale';
import type { CategoryStyle } from '../types/colors';
import { decodeHtmlEntities, isMissingValue } from '../utilities/helpers';
import { resolvePatternFill } from '../utilities/resolvePatternFill';
import {
	getLinearRampStops,
	mapScaleStyleKey,
	thresholdBinLabel,
	thresholdLabelFill,
	thresholdLegendItems,
	type ThresholdLegendLanguage,
} from './thresholdLegendLabels';

export type ValueColorScaleMode = 'linear' | 'threshold' | 'ordinal';

export type CreateValueColorScaleArgs = {
	mode?: ValueColorScaleMode | string | null;
	domain?: Array<string | number> | null;
	colors: string[];
	emptyFill?: string;
	seriesStyles?: Record<string, CategoryStyle | undefined> | null;
	/** Threshold bin language. Keys `seriesStyles` by bin labels such as `Less than 10`. */
	legend?: ThresholdLegendLanguage | null;
	/** Ordinal legend order. Falls back to `domain` when empty. */
	legendOrder?: string[] | null;
};

export type ValueColorScale = {
	mode: ValueColorScaleMode;
	/** Resolve a fill for a numeric/string value; null/undefined → emptyFill. */
	getFill: (value: string | number | null | undefined) => string;
	/** Scale instance useful for LegendLinear / LegendThreshold / LegendOrdinal. */
	scale: any;
	domain: Array<string | number>;
	range: string[];
	/** One `ClickableLegend` label per bin, category, or ramp stop. */
	legendItems: ValueScaleLegendItem[];
	/** `seriesStyles` key for a value: category, bin language, or none for linear. */
	styleKey: (
		value: string | number | null | undefined
	) => string | number | null | undefined;
	/** Scale color behind a style key, for hatch defs. Linear has none. */
	keyFill: (key: string) => string | undefined;
	/** Scale fill with the series paint for `styleKey` laid over it. */
	getPaint: (
		value: string | number | null | undefined,
		defaults?: ResolveBinPaintDefaults
	) => BinMarkPaint;
};

export type ValueScaleLegendItem = {
	text: string;
	value: string | undefined;
	datum: string | number | undefined;
	index: number;
};

/**
 * Strip `light-dark(light, dark)` wrappers so d3/visx scales get a concrete hex.
 *
 * @param color Palette color, possibly a `light-dark()` value.
 */
export function resolveSolidColor(color: string): string {
	if (!color) {
		return '#cccccc';
	}
	const match = color.match(/^light-dark\(([^,]+),/);
	return match ? match[1].trim() : color;
}

/**
 * Overlay a named series fill on a value-scale color.
 *
 * Ordinal and threshold bins key `seriesStyles` by the bin label.
 * A missing series fill leaves the scale color in place.
 *
 * @param scaleFill    Color from the value scale.
 * @param binLabel     Domain key for this bin.
 * @param seriesStyles Named category styles.
 */
export function resolveBinFill(
	scaleFill: string,
	binLabel: string | number | null | undefined,
	seriesStyles?: Record<string, CategoryStyle | undefined> | null
): string {
	if (binLabel === null || binLabel === undefined || binLabel === '') {
		return scaleFill;
	}

	return seriesStyles?.[String(binLabel)]?.fill ?? scaleFill;
}

export type BinMarkPaint = {
	fill: string;
	stroke?: string;
	strokeWidth?: number;
	strokeOpacity?: number;
	opacity?: number;
};

export type ResolveBinPaintDefaults = {
	stroke?: string;
	strokeWidth?: number;
	opacity?: number;
};

/**
 * Overlay named series paint on a value-scale color.
 *
 * Ordinal bins key `seriesStyles` by the bin label. Fill, hatch, stroke,
 * and opacity come from that bag. A missing key leaves the scale defaults.
 *
 * @param scaleFill    Color from the value scale.
 * @param binLabel     Domain key for this bin.
 * @param seriesStyles Named category styles.
 * @param defaults     Map-path stroke and fade when the series has none.
 */
export function resolveBinPaint(
	scaleFill: string,
	binLabel: string | number | null | undefined,
	seriesStyles?: Record<string, CategoryStyle | undefined> | null,
	defaults: ResolveBinPaintDefaults = {}
): BinMarkPaint {
	const fill = resolveBinFill(scaleFill, binLabel, seriesStyles);
	const style =
		binLabel === null || binLabel === undefined || binLabel === ''
			? undefined
			: seriesStyles?.[String(binLabel)];
	const categoryKey =
		binLabel === null || binLabel === undefined ? '' : String(binLabel);

	return {
		fill:
			resolvePatternFill(
				{ fill, pattern: style?.pattern },
				categoryKey
			) ?? fill,
		stroke: style?.stroke ?? defaults.stroke,
		strokeWidth: style?.strokeWidth ?? defaults.strokeWidth,
		strokeOpacity: style?.strokeOpacity,
		opacity: style?.opacity ?? defaults.opacity,
	};
}

/**
 * Shared value→color scale used by maps and heat-map tables: fill,
 * series-style key, paint, and legend items for one scale mode.
 *
 * @param args Scale mode, domain, palette, and series styles.
 */
export function createValueColorScale(
	args: CreateValueColorScaleArgs
): ValueColorScale {
	const base = buildValueScale(args);
	const styleKey: ValueColorScale['styleKey'] = (value) =>
		mapScaleStyleKey(
			base.mode,
			value,
			base.domain,
			args.legend ?? undefined
		);

	const keyFill: ValueColorScale['keyFill'] = (key) => {
		switch (base.mode) {
			case 'threshold':
				return thresholdLabelFill(
					key,
					base.domain,
					args.legend ?? undefined,
					base.range
				);
			case 'ordinal':
				return base.scale(key);
			case 'linear':
				return undefined;
			default: {
				const unhandled: never = base.mode;
				return unhandled;
			}
		}
	};

	return {
		...base,
		styleKey,
		keyFill,
		getPaint: (value, defaults = {}) =>
			resolveBinPaint(
				base.getFill(value),
				styleKey(value),
				args.seriesStyles,
				defaults
			),
	};
}

function buildValueScale({
	mode = 'linear',
	domain = [],
	colors,
	emptyFill = '#F5F5F5',
	seriesStyles = null,
	legend = null,
	legendOrder = null,
}: CreateValueColorScaleArgs): Omit<
	ValueColorScale,
	'styleKey' | 'keyFill' | 'getPaint'
> {
	const resolvedMode: ValueColorScaleMode =
		mode === 'threshold' || mode === 'ordinal' || mode === 'linear'
			? mode
			: 'linear';
	const range = colors?.length ? colors : ['#cce5f0', '#002d47'];
	const safeDomain = domain ?? [];

	if (resolvedMode === 'ordinal') {
		const ordinalDomain = safeDomain.map(String);
		const scale = scaleOrdinal<string, string>({
			domain: ordinalDomain,
			range,
		});
		const legendCategories = legendOrder?.length
			? legendOrder
			: ordinalDomain;
		return {
			mode: resolvedMode,
			scale,
			domain: ordinalDomain,
			range,
			legendItems: legendCategories.map((category, index) => ({
				text: decodeHtmlEntities(category),
				value: scale(category),
				datum: category,
				index,
			})),
			getFill: (value) => {
				if (isMissingValue(value)) {
					return emptyFill;
				}
				return resolveBinFill(
					scale(String(value)) || emptyFill,
					value,
					seriesStyles
				);
			},
		};
	}

	const numericDomain = safeDomain
		.map((d) => (typeof d === 'number' ? d : parseFloat(String(d))))
		.filter((d) => Number.isFinite(d));

	if (resolvedMode === 'threshold') {
		const scale = scaleThreshold<number, string>({
			domain: numericDomain,
			range,
		});
		return {
			mode: resolvedMode,
			scale,
			domain: numericDomain,
			range,
			legendItems: thresholdLegendItems(
				numericDomain,
				range,
				legend ?? undefined
			),
			getFill: (value) => {
				if (isMissingValue(value)) {
					return emptyFill;
				}
				const n =
					typeof value === 'number'
						? value
						: parseFloat(String(value));
				if (!Number.isFinite(n)) {
					return emptyFill;
				}
				return resolveBinFill(
					scale(n) || emptyFill,
					thresholdBinLabel(n, numericDomain, legend ?? undefined),
					seriesStyles
				);
			},
		};
	}

	const linearDomain = getLinearRampStops(numericDomain);
	const solidRange = range.map(resolveSolidColor);
	const scale = scaleLinear<string>({
		domain: linearDomain,
		range: solidRange,
	});
	return {
		mode: 'linear',
		scale,
		domain: linearDomain,
		range: solidRange,
		legendItems: linearDomain.map((stop, index) => ({
			text: String(stop),
			value: scale(stop),
			datum: stop,
			index,
		})),
		getFill: (value) => {
			if (isMissingValue(value)) {
				return emptyFill;
			}
			const n =
				typeof value === 'number' ? value : parseFloat(String(value));
			if (!Number.isFinite(n)) {
				return emptyFill;
			}
			return scale(n) || emptyFill;
		},
	};
}
