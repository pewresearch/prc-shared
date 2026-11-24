import type { PanelRect } from './panelLayout';
import { resolvePanelRect, type PanelLike } from './panelRect';

export type PositioningContext = 'chart' | 'inner' | 'panel' | 'panel-inner';

export type PositioningScale = {
	widthRatio: number;
	heightRatio: number;
	originX: number;
	originY: number;
	refWidth: number;
	refHeight: number;
	displayWidth: number;
	displayHeight: number;
};

export type LayoutPadding = {
	top: number;
	right: number;
	bottom: number;
	left: number;
};

export type PositioningLayout = {
	width: number;
	height: number;
	padding: LayoutPadding;
};

export type GetPositioningScaleArgs = {
	context: PositioningContext;
	panelKey?: string | null;
	layout: PositioningLayout;
	chartWidth: number;
	chartHeight: number;
	panels?: PanelLike[] | null;
	/** Current display/grid rects (reflow with chartWidth / restack). */
	panelRects?: PanelRect[] | null;
	/** Design-time rects at layout inner width + design columns (reference for stored offsets). */
	designPanelRects?: PanelRect[] | null;
	/** Outer grid offset in display space (SM padded Group). Defaults to layout padding. */
	gridOffset?: { x: number; y: number };
	/** Plot insets inside the panel cell (for panel-inner). */
	titlePad?: number;
	leftInset?: number;
	bottomInset?: number;
};

/**
 * Convert layout-space coords to display pixels (origin + layout * ratio).
 *
 * @param x     Layout-space x.
 * @param y     Layout-space y.
 * @param scale Ratios and origin of the coordinate frame.
 */
export function scalePositionToDisplay(
	x: number,
	y: number,
	scale: Pick<
		PositioningScale,
		'widthRatio' | 'heightRatio' | 'originX' | 'originY'
	>
): { x: number; y: number } {
	return {
		x: scale.originX + x * scale.widthRatio,
		y: scale.originY + y * scale.heightRatio,
	};
}

/**
 * Convert display pixels back to layout-space for persistence.
 *
 * @param x     Display x in pixels.
 * @param y     Display y in pixels.
 * @param scale Ratios and origin of the coordinate frame.
 */
export function scalePositionToLayout(
	x: number,
	y: number,
	scale: Pick<
		PositioningScale,
		'widthRatio' | 'heightRatio' | 'originX' | 'originY'
	>
): { x: number; y: number } {
	return {
		x:
			scale.widthRatio > 0
				? (x - scale.originX) / scale.widthRatio
				: x - scale.originX,
		y:
			scale.heightRatio > 0
				? (y - scale.originY) / scale.heightRatio
				: y - scale.originY,
	};
}

function resolvePanelPair(args: GetPositioningScaleArgs): {
	rect: PanelRect;
	designRect: PanelRect;
} | null {
	if (!args.panelKey || !args.panels || !args.panelRects?.length) {
		return null;
	}
	const rect = resolvePanelRect({
		panels: args.panels,
		rects: args.panelRects,
		panelKey: args.panelKey,
	});
	if (!rect) {
		return null;
	}
	const resolvedDesign = args.designPanelRects?.length
		? resolvePanelRect({
				panels: args.panels,
				rects: args.designPanelRects,
				panelKey: args.panelKey,
			})
		: null;
	// Fall back to current rect when design rects are unavailable (e.g. tests).
	return { rect, designRect: resolvedDesign ?? rect };
}

/**
 * Shared coordinate frame for annotations, drawings, detached legend items,
 * and small-multiples panel titles.
 *
 * - `chart`: full SVG including padding
 * - `inner`: data area (padding origin + inner ratios)
 * - `panel`: panel cell (gridOffset + rect); X scales vs design cell width
 * - `panel-inner`: plot area inside cell (title + axis insets); scales vs design plot
 *
 * Panel rects from computePanelRects are already in display/grid space.
 * Stored offsets are in design/layout space relative to the design cell or plot.
 *
 * @param args Context, layout, chart size, and panel geometry.
 */
export function getPositioningScale(
	args: GetPositioningScaleArgs
): PositioningScale {
	const { layout, chartWidth, chartHeight, context } = args;
	const padL = layout.padding?.left ?? 0;
	const padT = layout.padding?.top ?? 0;
	const padR = layout.padding?.right ?? 0;
	const padB = layout.padding?.bottom ?? 0;
	const horiz = padL + padR;
	const vert = padT + padB;

	const chartWR = layout.width > 0 ? chartWidth / layout.width : 1;
	const chartHR = layout.height > 0 ? chartHeight / layout.height : 1;

	if (context === 'chart') {
		return {
			widthRatio: chartWR,
			heightRatio: chartHR,
			originX: 0,
			originY: 0,
			refWidth: layout.width,
			refHeight: layout.height,
			displayWidth: chartWidth,
			displayHeight: chartHeight,
		};
	}

	if (context === 'inner') {
		const innerLayoutW = Math.max(0, layout.width - horiz);
		const innerLayoutH = Math.max(0, layout.height - vert);
		const innerChartW = Math.max(0, chartWidth - horiz);
		const innerChartH = Math.max(0, chartHeight - vert);
		return {
			widthRatio: innerLayoutW > 0 ? innerChartW / innerLayoutW : 1,
			heightRatio: innerLayoutH > 0 ? innerChartH / innerLayoutH : 1,
			originX: padL,
			originY: padT,
			refWidth: innerLayoutW,
			refHeight: innerLayoutH,
			displayWidth: innerChartW,
			displayHeight: innerChartH,
		};
	}

	if (context !== 'panel' && context !== 'panel-inner') {
		return getPositioningScale({ ...args, context: 'chart' });
	}

	const pair = resolvePanelPair(args);
	if (!pair) {
		return getPositioningScale({ ...args, context: 'chart' });
	}

	const { rect, designRect } = pair;
	const gridX = args.gridOffset?.x ?? padL;
	const gridY = args.gridOffset?.y ?? padT;
	const titlePad = args.titlePad ?? rect.titlePad ?? 0;
	const leftInset = args.leftInset ?? 0;
	const bottomInset = args.bottomInset ?? 0;

	const designPlotWidth = Math.max(0, designRect.plotWidth - leftInset);
	const designPlotHeight = Math.max(0, designRect.plotHeight - bottomInset);
	const plotWidth = Math.max(0, rect.plotWidth - leftInset);
	const plotHeight = Math.max(0, rect.plotHeight - bottomInset);

	if (context === 'panel-inner') {
		const widthRatio =
			designPlotWidth > 0 ? plotWidth / designPlotWidth : 1;
		const heightRatio =
			designPlotHeight > 0 ? plotHeight / designPlotHeight : 1;
		return {
			widthRatio,
			heightRatio,
			originX: gridX + rect.x + leftInset,
			originY: gridY + rect.y + titlePad,
			refWidth: designPlotWidth,
			refHeight: designPlotHeight,
			displayWidth: plotWidth,
			displayHeight: plotHeight,
		};
	}

	// context === 'panel' — full cell; height locked so Y stays 1:1
	const widthRatio = designRect.width > 0 ? rect.width / designRect.width : 1;
	return {
		widthRatio,
		heightRatio: 1,
		originX: gridX + rect.x,
		originY: gridY + rect.y,
		refWidth: designRect.width,
		refHeight: designRect.height,
		displayWidth: rect.width,
		displayHeight: rect.height,
	};
}
