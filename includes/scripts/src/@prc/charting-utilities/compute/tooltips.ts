import { DataRender } from '../types/dataRender';
import { Layout } from '../types/layout';
import { decodeHtmlEntities, getDisplayValue } from '../utilities/helpers';
import {
	formatMinDisplayValue,
	selectFormattedNumber,
} from '../utilities/formatMinDisplayValue';
import { Tooltip } from '../types/tooltip';
import { Map } from '../types/map';
import { timeFormat } from 'd3-time-format';
import type { FlatData } from '../types/flatData';
import { localPoint } from '@visx/event';
import type { EventType } from '@visx/event/lib/types';
import type { Point } from '@visx/point';

type TooltipData = {
	[key: string]: string | number | boolean | null | undefined;
};

type TooltipPoint = {
	x: any;
	y: any;
	category: any;
	color?: any;
	/** Full flat row for arbitrary `{{key}}` template tokens. */
	data?: Record<string, unknown>;
	/**
	 * Series key for the `__displayValues` lookup when `category` does not hold
	 * it, as on maps, where `category` feeds the `{{column}}` token instead.
	 */
	series?: string;
};

/**
 * Attach the flat row so rich tooltip templates can resolve arbitrary `{{key}}`
 * tokens beyond the virtual row / value / column placeholders.
 * @param point
 * @param point.x
 * @param point.y
 * @param point.category
 * @param point.color
 * @param row
 */
function tooltipFormatPoint(
	point: { x: any; y: any; category: any; color?: any },
	row?: Record<string, unknown> | null
): TooltipPoint {
	if (!row) {
		return point;
	}
	return { ...point, data: row };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function resolveSvgRoot(element: Element): SVGSVGElement | null {
	if (element.localName === 'svg' && element.namespaceURI === SVG_NS) {
		return element as SVGSVGElement;
	}
	const owner = (element as SVGGraphicsElement).ownerSVGElement;
	return owner ?? null;
}

function getEventClientCoords(
	event: EventType
): { x: number; y: number } | null {
	if ('clientX' in event && 'clientY' in event) {
		return { x: event.clientX, y: event.clientY };
	}
	if (
		'changedTouches' in event &&
		event.changedTouches &&
		event.changedTouches.length > 0
	) {
		return {
			x: event.changedTouches[0].clientX,
			y: event.changedTouches[0].clientY,
		};
	}
	return null;
}

function asPoint(x: number, y: number): Point {
	return {
		x,
		y,
		toArray: () => [x, y],
		value: () => ({ x, y }),
	} as Point;
}

/**
 * Viewport client coordinates → SVG user space (inverse screen CTM).
 * @param svgElement
 * @param clientX
 * @param clientY
 */
function svgViewportPointToUser(
	svgElement: Element,
	clientX: number,
	clientY: number
): { x: number; y: number } | null {
	const svg = resolveSvgRoot(svgElement);
	if (
		!svg ||
		typeof svg.createSVGPoint !== 'function' ||
		typeof svg.getScreenCTM !== 'function'
	) {
		return null;
	}
	const ctm = svg.getScreenCTM();
	if (!ctm || typeof ctm.inverse !== 'function') {
		return null;
	}
	const point = svg.createSVGPoint();
	point.x = clientX;
	point.y = clientY;
	const local = point.matrixTransform(ctm.inverse());
	return { x: local.x, y: local.y };
}

/**
 * Get local point coordinates for tooltip positioning.
 * Calculates coordinates relative to the SVG container element.
 * Handles iframe contexts (like WordPress editor) where standard methods may fail.
 *
 * @param svgElement - The SVG container element
 * @param event      - The mouse/touch event
 * @return Point object with x, y coordinates, or null
 */
function getLocalPoint(svgElement: Element, event: EventType): Point | null {
	if (!svgElement || !event) {
		return null;
	}

	const client = getEventClientCoords(event);
	if (client) {
		const fromCtm = svgViewportPointToUser(svgElement, client.x, client.y);
		if (fromCtm) {
			return asPoint(fromCtm.x, fromCtm.y);
		}

		const rect = svgElement.getBoundingClientRect();
		const x = client.x - rect.left - (svgElement.clientLeft || 0);
		const y = client.y - rect.top - (svgElement.clientTop || 0);
		return asPoint(x, y);
	}

	return localPoint(svgElement, event);
}

/**
 * Map SVG user-space coordinates (same space as `getLocalPoint`) to viewport
 * pixels for portaled `position: fixed` tooltips.
 *
 * Adding `x` to `getBoundingClientRect().left` is only correct when the SVG
 * screen CTM has no scale. Editor iframe zoom and CSS transforms break that;
 * `getScreenCTM()` accounts for those transforms.
 *
 * @param svgElement - SVG (or element inside one) that anchors the tooltip.
 * @param x          - Horizontal coordinate in SVG user space.
 * @param y          - Vertical coordinate in SVG user space.
 */

function svgUserPointToViewport(
	svgElement: Element | null | undefined,
	x: number,
	y: number
): { x: number; y: number } {
	if (!svgElement) {
		return { x, y };
	}

	// Avoid instanceof: chart nodes in the editor canvas iframe belong to a
	// different JS realm than the bundle, so constructor checks fail spuriously.
	const svg = resolveSvgRoot(svgElement);

	if (
		svg &&
		typeof svg.createSVGPoint === 'function' &&
		typeof svg.getScreenCTM === 'function'
	) {
		const ctm = svg.getScreenCTM();
		if (ctm) {
			const point = svg.createSVGPoint();
			point.x = x;
			point.y = y;
			const screen = point.matrixTransform(ctm);
			return { x: screen.x, y: screen.y };
		}
	}

	const rect = svgElement.getBoundingClientRect();
	return {
		x: x + rect.left,
		y: y + rect.top,
	};
}

function styleTooltipString(
	formatString: string,
	color: string,
	wrapUnstyledTokens = true
) {
	// Apply legacy modifiers to each token. Legacy formats also wrap plain
	// tokens, while RichText templates preserve their authored markup.
	const formatted = formatString.replace(/{{(.*?)}}/g, (match, key) => {
		let isBold, isColor, isLowerCase;
		if (key.indexOf('.isBold()') > -1) {
			isBold = true;
			key = key.replace('.isBold()', '');
		}
		if (key.indexOf('.isColor()') > -1) {
			isColor = true;
			key = key.replace('.isColor()', '');
		}
		if (key.indexOf('.toLowerCase()') > -1) {
			isLowerCase = true;
			key = key.replace('.toLowerCase()', '');
		}
		if (isColor || isBold || isLowerCase) {
			return `<span style="color: ${isColor ? color : 'inherit'}; font-weight: ${
				isBold ? 'bold' : 'normal'
			}; text-transform: ${
				isLowerCase ? 'lowercase' : 'none'
			};">{{${key}}}</span>`;
		}
		return wrapUnstyledTokens ? `<span>{{${key}}}</span>` : match;
	});
	return formatted;
}

function formatTooltipTokenValue(value: TooltipData[string]) {
	if (null === value || undefined === value || value === '') {
		return '';
	}
	return decodeHtmlEntities(value.toString());
}

function formatTooltipString(formatString: string) {
	return function (data: TooltipData) {
		const formatted = formatString
			.replace(/{{\s*(.+?)\.toLowerCase\(\)\s*}}/g, (_match, key) => {
				const originalKey = key.trim();
				const value = data[originalKey];
				return value
					? decodeHtmlEntities(value.toString().toLowerCase())
					: '';
			})
			.replace(/{{\s*(.+?)\s*}}/g, (_match, key) => {
				const trimmedKey = key.trim();
				return formatTooltipTokenValue(data[trimmedKey]);
			});
		return formatted;
	};
}

function shouldSkipRowTokenKey(key: string) {
	return key.startsWith('__') || key === 'tooltip' || key === 'tooltipHeader';
}

function stringifyRowTokenValue(value: unknown): string | number {
	if (null === value || undefined === value) {
		return '';
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return value;
	}
	if (typeof value === 'boolean') {
		return value ? 'true' : 'false';
	}
	return String(value);
}

/**
 * Drop the sign from a numeric row field. Strings keep their authored
 * formatting (trailing zeros, thousands separators) by losing the leading
 * minus rather than round-tripping through `Number`.
 * @param value
 */
function absoluteRowTokenValue(value: string | number): string | number {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? Math.abs(value) : value;
	}
	const trimmed = value.trim();
	if (!trimmed.startsWith('-') || !Number.isFinite(Number(trimmed))) {
		return value;
	}
	return trimmed.slice(1);
}

function mergeRowFieldsIntoTokenBag(
	data: Record<string, unknown> | undefined,
	absoluteValue: boolean
): TooltipData {
	if (!data) {
		return {};
	}
	return Object.entries(data).reduce<TooltipData>((acc, [key, value]) => {
		if (shouldSkipRowTokenKey(key)) {
			return acc;
		}
		const stringified = stringifyRowTokenValue(value);
		acc[key] = absoluteValue
			? absoluteRowTokenValue(stringified)
			: stringified;
		return acc;
	}, {});
}
const getTooltipHeaderFormat = (
	d: { x: any; category: any },
	config: Tooltip
) => {
	// if d.x is a date, format it
	const d3DateFormat = timeFormat(config.dateFormat);
	const x = d.x instanceof Date ? d3DateFormat(d.x) : d.x;
	// if d.category is a date, format it
	const category =
		d.category instanceof Date ? d3DateFormat(d.category) : d.category;
	// do some formatting on the numerical value

	if ('categoryValue' === config.headerValue) {
		return typeof category === 'string'
			? decodeHtmlEntities(category)
			: category;
	}
	return typeof x === 'string' ? decodeHtmlEntities(x) : x;
};

/**
 * Format the hovered point into the token substitution bag used by both the
 * rich `template` and legacy mustache `format` paths.
 * @param d
 * @param config
 * @param dataRender
 */
function buildTooltipTokenData(
	d: TooltipPoint,
	config: Tooltip,
	dataRender: DataRender | undefined
): TooltipData & {
	row: string | number;
	column: string | number;
	value: string | number;
	floored: string | null;
} {
	const d3DateFormat = timeFormat(config.dateFormat);
	const row = d.x instanceof Date ? d3DateFormat(d.x) : d.x;
	const column =
		d.category instanceof Date ? d3DateFormat(d.category) : d.category;

	const rowFields = mergeRowFieldsIntoTokenBag(d.data, config.absoluteValue);

	if (dataRender && dataRender.mapScale === 'ordinal') {
		return { ...rowFields, row, column, value: d.y, floored: null };
	}

	const displayValue = getDisplayValue(d.data, d.series ?? d.category);
	if (null !== displayValue) {
		// A display value that opens with `<` needs the same HTML escape as a floor.
		const escaped = displayValue.startsWith('<') ? displayValue : null;
		return {
			...rowFields,
			row,
			column,
			value: displayValue,
			floored: escaped,
		};
	}

	let value: number | string = config.absoluteValue
		? Math.abs(d.y)
		: Number(d.y);

	// A value below the floor stands in for the number entirely; the floor has
	// already been rendered through the same decimal, abbreviation and locale
	// pipeline that the branch below would apply.
	const floored = formatMinDisplayValue(Number(value), config);
	if (null !== floored) {
		return { ...rowFields, row, column, value: floored, floored };
	}

	value = selectFormattedNumber(Number(value), config);

	return { ...rowFields, row, column, value, floored: null };
}
/**
 * `formatTooltipString` decodes entities on every value it substitutes, so
 * escaping the `<` before substitution would just be decoded back out. The
 * body is injected with dangerouslySetInnerHTML, where a bare `<` reads as
 * the start of a tag.
 * @param body
 * @param floored
 */
function escapeTooltipFloor(body: string, floored: string | null) {
	if (null === floored) {
		return body;
	}
	return body.split(floored).join(`&lt;${floored.slice(1)}`);
}

/**
 * Resolve a rich HTML tooltip template: substitute `{{row}}` / `{{value}}` /
 * `{{column}}` and row-field tokens after applying legacy token modifiers and
 * running the value through the number pipeline.
 * @param template
 * @param d
 * @param config
 * @param dataRender
 */
function resolveTooltipTemplate(
	template: string,
	d: TooltipPoint,
	config: Tooltip,
	dataRender: DataRender | undefined
) {
	const tokenBag = buildTooltipTokenData(d, config, dataRender);
	const { floored, ...substitutionBag } = tokenBag;
	const styledTemplate = styleTooltipString(template, d.color, false);
	const body = formatTooltipString(styledTemplate)(substitutionBag);
	return escapeTooltipFloor(body, floored);
}

const getTooltipFormat = (
	d: TooltipPoint,
	config: Tooltip,
	dataRender: DataRender | undefined
) => {
	// Rich HTML template wins over the legacy mustache `format` string.
	// Default remains null so existing charts keep using `format`.
	if (null !== config.template && undefined !== config.template) {
		return resolveTooltipTemplate(config.template, d, config, dataRender);
	}

	//if custom label is set, use it
	if (config.customFormat) {
		const raw = config.absoluteValue ? Math.abs(d.y) : Number(d.y);
		return config.customFormat(raw);
	}

	const {
		row: x,
		column: category,
		value: datum,
		floored,
	} = buildTooltipTokenData(d, config, dataRender);

	// TODO: extend toolitip formatter to support full data object, so that we can return non-numeric values tied to the data point
	// eg. {{data.tooltipValue}} would return the value of data.tooltipValue
	if (dataRender && dataRender.mapScale === 'ordinal') {
		if (config.format && config.format.length > 0) {
			// quick conversion for strings using sprintf format
			const reformat = config.format
				.replace(/%1\$s/g, '{{column}}')
				.replace(/%2\$s/g, '{{value}}')
				.replace(/%3\$s/g, '{{row}}');
			const styledFormat = styleTooltipString(reformat, d.color);
			const format = formatTooltipString(styledFormat);
			return format({ column: category, value: datum, row: x });
		}
		const format = formatTooltipString('{{row}}: {{value}}');
		return format({ row: x, value: datum });
	}

	if (config.format && config.format.length > 0) {
		// quick conversion for strings using sprintf format
		const reformat = config.format
			.replace(/%1\$s/g, '{{column}}')
			.replace(/%2\$s/g, '{{value}}')
			.replace(/%3\$s/g, '{{row}}');
		const styledFormat = styleTooltipString(reformat, d.color);
		const format = formatTooltipString(styledFormat);
		return escapeTooltipFloor(
			format({ column: category, value: datum, row: x }),
			floored
		);
	}
	const format = formatTooltipString('{{row}}: {{value}}');
	return escapeTooltipFloor(format({ row: x, value: datum }), floored);
};

const getTooltipVisible = (
	_layout: Layout,
	_chartWidth: number,
	tooltip: Tooltip
) => {
	return tooltip.active;
};

const getTooltipMapDeemphasisProps = (
	tooltip: Tooltip,
	map: Map,
	id: string | number,
	tooltipData: FlatData
) => {
	const {
		deemphasizeSiblings,
		deemphasizeOpacity,
		emphasizeStrokeActive,
		emphasizeStrokeColor,
		emphasizeStrokeWidth,
	} = tooltip;

	// Base properties
	const baseProps = {
		opacity: 1,
		stroke: map.pathStroke,
		strokeWidth: map.pathStrokeWidth,
	};

	// Early return if no valid data
	if (!id || !tooltipData) {
		return baseProps;
	}

	const idMatches = id === tooltipData.id;
	// Check if this element should be deemphasized
	const shouldDeemphasize =
		deemphasizeSiblings && deemphasizeOpacity && !idMatches;

	if (!shouldDeemphasize && !idMatches) {
		return baseProps;
	}
	if (!shouldDeemphasize && idMatches) {
		if (emphasizeStrokeActive) {
			return {
				opacity: baseProps.opacity,
				stroke: emphasizeStrokeColor,
				strokeWidth: emphasizeStrokeWidth,
			};
		}
		return baseProps;
	}
	// Return deemphasized properties
	return {
		opacity: deemphasizeOpacity,
		stroke: map.pathStroke,
		strokeWidth: map.pathStrokeWidth,
	};
};

export {
	getLocalPoint,
	svgUserPointToViewport,
	getTooltipHeaderFormat,
	getTooltipFormat,
	getTooltipVisible,
	getTooltipMapDeemphasisProps,
	tooltipFormatPoint,
};
