import { Animate } from './animate';
import { Animation } from './animation';
import { Bar } from './bar';
import { CategoryStyle, Colors } from './colors';
import { DataRender } from './dataRender';
import { DiffColumn } from './diffColumn';
import { NetValues } from './netValues';
import { DotPlot } from './dotPlot';
import { Events } from './events';
import { ExplodedBar } from './explodedBar';
import { Labels } from './labels';
import { Layout } from './layout';
import { Legend } from './legend';
import { Line } from './line';
import { Metadata } from './metadata';
import { DivergingBar } from './divergingBar';
import { Nodes } from './nodes';
import { Pie } from './pie';
import { PlotBands } from './plotBands';
import { Shapes } from './shapes';
import { Tooltip } from './tooltip';
import { independentAxis } from './independentAxis';
import { dependentAxis } from './dependentAxis';
import { Voronoi } from './voronoi';
import { RegressionLine } from './regressionLine';
import { Map } from './map';
import { Custom } from './custom';
import { ErrorBars } from './errorBars';
import { AnnotationsConfig, TextAnnotation, MetadataText } from './text';
import { DrawingsConfig } from './drawings';
import { BeeSwarm } from './beeSwarm';
import { Treemap } from './treemap';
import { Sankey } from './sankey';
import { SmallMultiples } from './smallMultiples';
import { Waffle } from './waffle';
import { HeatMapTable } from './heatMapTable';
import { Hemicycle } from './hemicycle';

type BaseConfig = {
	animate: Animate;
	animation?: Animation;
	bar: Bar;
	beeSwarm: BeeSwarm;
	colors: Colors;
	seriesStyles?: Record<string, CategoryStyle>;
	dataRender: DataRender;
	diffColumn: DiffColumn;
	divergingBar: DivergingBar;
	dotPlot: DotPlot;
	errorBars: ErrorBars;
	events: Events;
	explodedBar: ExplodedBar;
	heatMapTable: HeatMapTable;
	hemicycle: Hemicycle;
	labels: Labels;
	layout: Layout;
	legend: Legend;
	line: Line;
	metadata: Metadata;
	netValues: NetValues;
	nodes: Nodes;
	pie: Pie;
	plotBands: PlotBands;
	shapes: Shapes;
	tooltip: Tooltip;
	independentAxis: independentAxis;
	dependentAxis: dependentAxis;
	voronoi: Voronoi;
	regression: RegressionLine;
	map: Map;
	custom: Custom;
	annotations: AnnotationsConfig;
	drawings: DrawingsConfig;
	treemap: Treemap;
	sankey: Sankey;
	smallMultiples: SmallMultiples;
	waffle: Waffle;
};

export type {
	BaseConfig,
	Animate,
	Animation,
	Bar,
	BeeSwarm,
	Colors,
	DataRender,
	DiffColumn,
	NetValues,
	DotPlot,
	ErrorBars,
	Events,
	ExplodedBar,
	Labels,
	Layout,
	Legend,
	Line,
	Metadata,
	Nodes,
	Pie,
	PlotBands,
	Shapes,
	Tooltip,
	independentAxis,
	dependentAxis,
	Voronoi,
	RegressionLine,
	DivergingBar,
	Map,
	Custom,
	AnnotationsConfig,
	TextAnnotation,
	MetadataText,
	DrawingsConfig,
	Treemap,
	Sankey,
	SmallMultiples,
	Waffle,
	HeatMapTable,
	Hemicycle,
};
