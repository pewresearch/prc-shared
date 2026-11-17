/**
 * Legend item text layout.
 *
 * Legend items use the same alignment values as text annotations
 * (`textAnchor` / `verticalAnchor`). Saved `textAlign` values
 * (`left` | `center` | `right`) still resolve when `textAnchor` is unset.
 */

export type LegendTextAnchor = 'start' | 'middle' | 'end';
export type LegendVerticalAnchor = 'start' | 'middle' | 'end';

export interface LegendTextLayoutInput {
	textAnchor?: LegendTextAnchor;
	verticalAnchor?: LegendVerticalAnchor;
	textAlign?: 'left' | 'center' | 'right';
	maxWidth?: number;
	lineHeight?: number;
	letterSpacing?: number;
}

export function resolveLegendTextAnchor(
	entry?: LegendTextLayoutInput
): LegendTextAnchor | undefined {
	if (entry?.textAnchor) {
		return entry.textAnchor;
	}
	if (entry?.textAlign === 'center') {
		return 'middle';
	}
	if (entry?.textAlign === 'right') {
		return 'end';
	}
	if (entry?.textAlign === 'left') {
		return 'start';
	}
	return undefined;
}

export function cssTextAlignFromAnchor(
	anchor?: LegendTextAnchor
): 'left' | 'center' | 'right' | undefined {
	if (anchor === 'middle') {
		return 'center';
	}
	if (anchor === 'end') {
		return 'right';
	}
	if (anchor === 'start') {
		return 'left';
	}
	return undefined;
}

export function alignItemsFromVerticalAnchor(
	anchor?: LegendVerticalAnchor
): 'flex-start' | 'center' | 'flex-end' | undefined {
	if (anchor === 'start') {
		return 'flex-start';
	}
	if (anchor === 'middle') {
		return 'center';
	}
	if (anchor === 'end') {
		return 'flex-end';
	}
	return undefined;
}

export function dominantBaselineFromVerticalAnchor(
	anchor?: LegendVerticalAnchor
): 'middle' | 'hanging' | 'auto' {
	if (anchor === 'middle') {
		return 'middle';
	}
	if (anchor === 'end') {
		return 'hanging';
	}
	return 'auto';
}

// CSS for an HTML legend label. `stretch` lets a column legend align short
// labels inside the width of the longest item. A set max width becomes the
// wrap box so text anchor can move wrapped lines.
export function legendLabelTextStyle(
	entry?: LegendTextLayoutInput,
	options?: { stretch?: boolean; labelOwnsWidth?: boolean }
): Record<string, string | number> {
	if (!entry) {
		return {};
	}

	const style: Record<string, string | number> = {};
	if (entry.lineHeight) {
		style.lineHeight = entry.lineHeight;
	}
	if (entry.letterSpacing !== undefined && entry.letterSpacing !== null) {
		style.letterSpacing = `${entry.letterSpacing}px`;
	}

	const textAlign = cssTextAlignFromAnchor(resolveLegendTextAnchor(entry));
	if (textAlign) {
		style.textAlign = textAlign;
	}

	if (entry.maxWidth) {
		style.whiteSpace = 'normal';
		style.overflowWrap = 'break-word';
		if (options?.labelOwnsWidth !== false) {
			style.maxWidth = `${entry.maxWidth}px`;
			if (textAlign) {
				style.width = `${entry.maxWidth}px`;
			}
		}
	}

	if (textAlign && options?.stretch && !style.width) {
		style.flex = '1 1 auto';
	}

	if (textAlign && entry.maxWidth && options?.labelOwnsWidth === false) {
		style.flex = '1 1 auto';
		style.minWidth = 0;
	}

	return style;
}
