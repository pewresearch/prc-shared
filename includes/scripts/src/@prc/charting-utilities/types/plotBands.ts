import type { Pattern } from './pattern';

export type PlotBands = {
	active: boolean;
	allowDrag: boolean;
	allowResize: boolean;
	dimension: string;
	bands: {
		x: number[];
		y: number[];
		label: string;
		style: {
			band: {
				stroke: string;
				fill: string;
				fillOpacity: number;
				/** Hatch from the shared series pattern set. Absent or `solid` keeps the fill color. */
				pattern?: Pattern;
			};
			label: {
				fontSize: number;
				fill: string;
				/**
				 * @deprecated Use `rotation`. `vertical` reads as 90 degrees when `rotation` is absent.
				 */
				orientation?: 'horizontal' | 'vertical';
				/** Degrees clockwise around the label anchor. Replaces `orientation`. */
				rotation?: number;
				align: 'top' | 'bottom';
				dx: number;
				dy: number;
				fontFamily?: string;
				fontWeight?: 'normal' | 'bold' | '600' | '700';
				fontStyle?: 'normal' | 'italic';
				textAnchor?: 'start' | 'middle' | 'end';
				verticalAnchor?: 'start' | 'middle' | 'end';
				/** Wrap width in pixels. `0` or absent keeps the label on one line. */
				maxWidth?: number;
				opacity?: number;
				textOutline?: boolean;
			};
		};
	}[];
};
