import { decodeHtmlEntities } from '../utilities/helpers';

export const DEFAULT_THRESHOLD_LABEL_LOWER = 'Less than ';
export const DEFAULT_THRESHOLD_LABEL_DELIMITER = 'to';
export const DEFAULT_THRESHOLD_LABEL_UPPER = 'More than ';

export type ThresholdLegendLanguage = {
	labelLower?: string;
	labelDelimiter?: string;
	labelUpper?: string;
};

function numericBreaks(
	domain: Array<string | number> | null | undefined
): number[] {
	return (Array.isArray(domain) ? domain : [])
		.map((value) =>
			typeof value === 'number' ? value : parseFloat(String(value))
		)
		.filter((value) => Number.isFinite(value));
}

/**
 * Numeric stops of a linear ramp. Every stop is kept; one stop ramps
 * up from 0, and none falls back to 0–100.
 *
 * @param domain Ramp stops.
 */
export function getLinearRampStops(
	domain: Array<string | number> | null | undefined
): number[] {
	const stops = numericBreaks(domain);

	if (stops.length >= 2) {
		return stops;
	}

	return stops.length === 1 ? [0, stops[0]] : [0, 100];
}

/**
 * visx LegendThreshold-style labels for a numeric domain.
 * n breaks produce n+1 labels (below, inner ranges, above).
 *
 * @param domain Threshold breaks.
 * @param legend Label language.
 */
export function getThresholdLegendLabels(
	domain: Array<string | number> | null | undefined = [],
	legend: ThresholdLegendLanguage = {}
): string[] {
	const breaks = numericBreaks(domain);

	if (breaks.length === 0) {
		return [];
	}

	const labelLower = legend.labelLower ?? DEFAULT_THRESHOLD_LABEL_LOWER;
	const labelDelimiter =
		legend.labelDelimiter ?? DEFAULT_THRESHOLD_LABEL_DELIMITER;
	const labelUpper = legend.labelUpper ?? DEFAULT_THRESHOLD_LABEL_UPPER;
	const inner = ` ${labelDelimiter} `;

	const labels = [`${labelLower}${breaks[0]}`];

	for (let index = 0; index < breaks.length - 1; index += 1) {
		labels.push(`${breaks[index]}${inner}${breaks[index + 1]}`);
	}

	labels.push(`${labelUpper}${breaks[breaks.length - 1]}`);

	return labels.map((label) => decodeHtmlEntities(label));
}

export type ThresholdLegendItem = {
	text: string;
	value: string | undefined;
	datum: number | undefined;
	index: number;
};

/**
 * Legend items for a threshold scale, one per bin.
 *
 * Replaces visx `LegendThreshold` labels, which find each bin by
 * searching the palette for its color. Extra palette slots then turn
 * into bins, and a series fill that repeats a spare color shows the
 * same bin twice. `datum` keeps the visx lower-bound value so saved
 * legend customizations keep their keys.
 *
 * @param domain Threshold breaks.
 * @param colors Compiled palette.
 * @param legend Label language.
 */
export function thresholdLegendItems(
	domain: Array<string | number> | null | undefined,
	colors: string[],
	legend: ThresholdLegendLanguage = {}
): ThresholdLegendItem[] {
	const breaks = numericBreaks(domain);

	return getThresholdLegendLabels(domain, legend).map((text, index) => ({
		text,
		value: colors[index],
		datum: index === 0 ? undefined : breaks[index - 1],
		index,
	}));
}

/**
 * Color-sorter key for a numeric value on a threshold scale.
 *
 * Matches d3 `scaleThreshold`: a value equal to a break belongs to the
 * next bin.
 *
 * @param value  Cell or feature value.
 * @param domain Threshold breaks.
 * @param legend Label language.
 */
export function thresholdBinLabel(
	value: string | number | null | undefined,
	domain: Array<string | number> | null | undefined,
	legend: ThresholdLegendLanguage = {}
): string | undefined {
	const labels = getThresholdLegendLabels(domain, legend);

	if (labels.length === 0) {
		return undefined;
	}

	if (value === null || value === undefined || value === '') {
		return undefined;
	}

	const n = typeof value === 'number' ? value : parseFloat(String(value));

	if (!Number.isFinite(n)) {
		return undefined;
	}

	const breaks = numericBreaks(domain);
	const index = breaks.findIndex((breakValue) => n < breakValue);

	return labels[index === -1 ? breaks.length : index];
}

/**
 * Style-map key for a map value scale.
 *
 * Ordinal keys the raw category. Threshold keys the bin language from
 * {@link getThresholdLegendLabels}. Linear has no key: a ramp takes its
 * fill from the scale, so series styles never apply to it.
 *
 * @param mapScale Active map scale.
 * @param value    Cell or feature value.
 * @param domain   Scale domain.
 * @param legend   Threshold label language.
 */
export function mapScaleStyleKey(
	mapScale: string | null | undefined,
	value: string | number | null | undefined,
	domain: Array<string | number> | null | undefined,
	legend: ThresholdLegendLanguage = {}
): string | number | null | undefined {
	if (mapScale === 'threshold') {
		return thresholdBinLabel(value, domain, legend);
	}

	if (mapScale === 'linear') {
		return undefined;
	}

	return value;
}

/**
 * Palette slot for a threshold bin label, used when a hatch def needs
 * the scale color rather than a custom series fill.
 *
 * @param label  Bin language key.
 * @param domain Threshold breaks.
 * @param legend Label language.
 * @param colors Compiled palette.
 */
export function thresholdLabelFill(
	label: string,
	domain: Array<string | number> | null | undefined,
	legend: ThresholdLegendLanguage | undefined,
	colors: string[]
): string | undefined {
	const index = getThresholdLegendLabels(domain, legend).indexOf(label);

	if (index < 0) {
		return undefined;
	}

	return colors[index];
}
