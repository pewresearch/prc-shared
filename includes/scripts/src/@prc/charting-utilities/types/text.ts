// Text annotation types
type TextAnnotation = {
	id?: string;
	/** Missing means `'text'`, so saved annotations keep rendering as text. */
	kind?: 'text' | 'image';
	x: number;
	y: number;
	text?: string;
	/** Image annotations: Media Library attachment ID and URL (PNG or Safe SVG–sanitized SVG). */
	mediaId?: number;
	src?: string;
	/** Image annotations: size in layout px, like `fontSize`. */
	width?: number;
	height?: number;
	/** Image annotations: fit the image inside width × height without distortion. Default true. */
	keepAspectRatio?: boolean;
	/** Image annotations: accessible name. Empty means decorative (`aria-hidden`). */
	alt?: string;
	fontSize?: number;
	fontWeight?: 'normal' | 'bold' | '600' | '700';
	fontStyle?: 'normal' | 'italic';
	fontFamily?: string;
	fill?: string;
	textAnchor?: 'start' | 'middle' | 'end';
	verticalAnchor?: 'start' | 'middle' | 'end';
	rotation?: number;
	link?: string;
	backgroundColor?: string;
	padding?: number;
	borderRadius?: number;
	opacity?: number;
	maxWidth?: number;
	/**
	 * Coordinate frame for x/y:
	 * - `'chart'`: full chart area including padding
	 * - `'inner'`: data area only
	 * - `'panel'`: small-multiples panel cell (requires `panelKey`)
	 * - `'panel-inner'`: plot area inside a panel cell (requires `panelKey`)
	 */
	positioningContext?: 'chart' | 'inner' | 'panel' | 'panel-inner';
	/** Panel key (column header or group value) when `positioningContext === 'panel'`. */
	panelKey?: string;
	textOutline?: boolean; // opt-in: renders a contrasting stroke behind the fill for readability on complex backgrounds
	onDrag?: (id: string, newX: number, newY: number) => void;
	onDragStart?: () => void;
	onDragEnd?: () => void;
};

type AnnotationsConfig = {
	active: boolean;
	items: TextAnnotation[];
};

// Metadata text types
type MetadataText = {
	title?: string;
	subtitle?: string;
	note?: string;
	tag?: string;
};

export type { TextAnnotation, AnnotationsConfig, MetadataText };
