export type ChartLayoutType =
	| 'bar'
	| 'diverging-bar'
	| 'line'
	| 'area'
	| 'scatter'
	| 'bee-swarm'
	| 'pie'
	| 'dot-plot'
	| 'stacked-bar'
	| 'single-stacked-bar'
	| 'grouped-bar'
	| 'exploded-bar'
	| 'stacked-area'
	| 'map-usa'
	| 'map-usa-counties'
	| 'map-usa-cbsa'
	| 'map-usa-block'
	| 'map-usa-hex'
	| 'map-world'
	| 'map-world-orthographic'
	| 'map-europe'
	| 'treemap'
	| 'sankey'
	| 'radar'
	| 'small-multiples'
	| 'waffle'
	| 'heat-map-table'
	| 'hemicycle';

export type LayoutOrientation = 'vertical' | 'horizontal';

export type LayoutOverflowX =
	| 'scroll-fixed-y-axis'
	| 'responsive'
	| 'scroll'
	| 'preserve-aspect-ratio';

export type Layout = {
	name: string;
	parentClass: string | undefined;
	type: ChartLayoutType;
	orientation: LayoutOrientation;
	width: number;
	height: number;
	padding: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
	overflowX: LayoutOverflowX;
	horizontalRules: boolean;
	mobileBreakpoint: number;
};
