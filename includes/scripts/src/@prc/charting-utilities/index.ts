// Types
export * from './types/animate';
export * from './types/animation';
export * from './types/bar';
export * from './types/colors';
export * from './types/pattern';
export * from './types/configTypes';
export * from './types/custom';
export * from './types/dataRender';
export * from './types/dateFormat';
export * from './types/dependentAxis';
export * from './types/diffColumn';
export * from './types/divergingBar';
export * from './types/dotPlot';
export * from './types/errorBars';
export * from './types/events';
export * from './types/explodedBar';
export * from './types/featureShape';
export * from './types/flatData';
export * from './types/independentAxis';
export * from './types/keys';
export * from './types/labels';
export * from './types/layout';
export * from './types/legend';
export * from './types/line';
export * from './types/map';
export * from './types/metadata';
export * from './types/netValues';
export * from './types/nodes';
export * from './types/beeSwarm';
export * from './types/pie';
export * from './types/plotBands';
export * from './types/shapes';
export * from './types/regressionLine';
export * from './types/stack';
export * from './types/tableData';
export * from './types/text';
export * from './types/tooltip';
export * from './types/unifiedTooltip';
export * from './types/voronoi';
export * from './types/windowSize';
export * from './types/drawings';
export * from './types/treemap';
export * from './types/sankey';
export * from './types/waffle';
export * from './types/heatMapTable';

// React hooks
export {
	useSize,
	useSeriesMask,
	useDarkMode,
	useLocalStorage,
	useMedia,
	useRegressionLine,
	useRegressionLines,
	useWorldCountryData,
	useStateData,
	useStateGridData,
	findStateDataRow,
	fipsToStateAbbr,
} from './hooks';
export type {
	UseSeriesMaskInput,
	UseWorldCountryDataArgs,
	UseWorldCountryDataResult,
	UseStateDataArgs,
	UseStateDataResult,
	UseStateGridDataArgs,
	StateGridBin,
	StateGridColumn,
} from './hooks';

// Pure utilities
export { DEFAULT_FONT_FAMILY } from './utilities/defaultFontFamily';
export { default as baseConfig } from './utilities/baseConfig';
export {
	randomDataPoints,
	randomDate,
	randomDataTime,
	randomDataPointsCountries,
} from './utilities/randomData';
export { dodge } from './utilities/dodge';
export type { DodgeCircle, DodgeOptions } from './utilities/dodge';
export {
	abbreviateNumber,
	labelFill,
	contrastLabelFillForLightDark,
	LABEL_OUTLINE_COLOR,
	getLabelFill,
	barFillForLabelContrast,
	getLabelOutlineStroke,
	getBarLabelFill,
	newDateByFormat,
	checkContrast,
	scaleAxisNumTicks,
	decodeHtmlEntities,
	getCustomLabel,
	getCustomLabelText,
	hasCategoryValue,
	isMissingValue,
	isLabelVisible,
	getCustomLabelStyle,
	getCustomTooltip,
	getDisplayValue,
	getGroupValue,
	generateElementKey,
	resolveLabelCutoff,
	resolveTextOutlineMode,
} from './utilities/helpers';
export {
	generateTickLabelKey,
	resolveTickLabelEntry,
} from './utilities/tickLabelKeys';
export type {
	TickLabelEntries,
	TickLabelEntry,
} from './utilities/tickLabelKeys';
export {
	layoutRichTextLines,
	parseRichText,
	stripRichText,
} from './utilities/richText';
export type { RichTextRun } from './utilities/richText';
export { shouldShowLinePoint } from './utilities/shouldShowLinePoint';
export {
	resolveCategoryColor,
	resolveCategoryOpacity,
	withCategoryOpacity,
	legendCategoryShapeStyle,
} from './utilities/resolveCategoryColor';
export { resolvePaint, resolveLinePathPaint } from './utilities/resolvePaint';
export {
	resolvePatternFill,
	seriesPatternId,
	legendPatternId,
	isHatchingPattern,
	resolvePatternSpec,
} from './utilities/resolvePatternFill';
export {
	HATCH_PATTERN_TYPES,
	PATTERN_EDITOR_LINES_HORIZONTAL,
	getPatternEditorOption,
	getPatternType,
	patternFromEditorOption,
	patternPrimaryPaintField,
	patternSupportsStrokeWidth,
	readPatternPrimaryPaint,
	readPatternStrokeWidth,
	withPatternType,
	withPatternPrimaryPaint,
	withPatternStrokeWidth,
} from './utilities/patternStyle';
export type { ResolvePaintArgs } from './utilities/resolvePaint';
export { resolveScaleNice } from './utilities/resolveScaleNice';
export {
	hasExplicitAxisDomain,
	isAutoAxisDomain,
} from './utilities/isAutoAxisDomain';
export { getLinearValueDataExtent } from './utilities/getLinearValueDataExtent';
export { resolveLinearScaleDomain } from './utilities/resolveLinearScaleDomain';
export { resolveTimeScaleDomain } from './utilities/resolveTimeScaleDomain';
export { DataContext, DataProvider } from './utilities/DataContext';
export type { LegendItemsController } from './utilities/DataContext';
export {
	INERT_SERIES_MASK,
	categoryKeyFromLegendDatum,
	chartTypeSupportsSeriesMask,
	markHideKey,
	seriesMaskShouldHideTooltip,
} from './utilities/seriesMask';
export type { SeriesMaskView } from './utilities/seriesMask';
export { createTopologyLoader } from './utilities/loadTopology';
export { MAP_REGION_PRESETS } from './utilities/mapRegionPresets';
export type { MapRegionPreset } from './utilities/mapRegionPresets';
export * from './utilities/colorPalettes';
export {
	REGRESSION_FNS,
	getRegressionFn,
	computeRegressionStats,
} from './utilities/regression';
export type { RegressionPoint, RegressionStats } from './utilities/regression';
export {
	getMaxAbsColumnValue,
	getMinPositiveColumnValue,
	createPointRadiusScale,
	resolvePointRadius,
} from './utilities/getPointRadiusScale';
export {
	formatMinDisplayValue,
	selectFormattedNumber,
} from './utilities/formatMinDisplayValue';
export type { MinDisplayValueConfig } from './utilities/formatMinDisplayValue';

// Small multiples (framework-agnostic)
export {
	enrichFacetRow,
	isFacetMetaKey,
	facetDataByColumn,
	deriveCategories,
	facetDataByGroup,
	sortPanelRowsByIndependent,
	computeSharedDomain,
	computePanelRects,
	computeGridHeight,
	resolveEffectiveColumns,
	resolvePanelRect,
	planPanelAxes,
	computeColumnBarRects,
	resolveBandDomain,
	computeHorizontalBarRects,
	computeBarPanelHeight,
	resolveSliceDomain,
	resolveGhostStroke,
	SMALL_MULTIPLES_SHARED_SERIES_KEY,
} from './smallMultiples';
export {
	resolveShapePaint,
	resolvePointPaint,
	resolveBarPaint,
	barRectStrokeDefaults,
	resolveDivergingSecondaryPaint,
} from './utilities/resolveShapePaint';
export { resolvePointSize } from './utilities/resolvePointSize';
export { resolveLabelStyle } from './utilities/resolveLabelStyle';
export type {
	ShapePaint,
	ShapePaintDefaults,
} from './utilities/resolveShapePaint';
export {
	generateSegmentKey,
	resolveSegmentPaint,
} from './utilities/resolveSegmentPaint';
export type {
	SegmentPaint,
	SegmentPaintDefaults,
} from './utilities/resolveSegmentPaint';
export {
	computeWaffleCells,
	allocateWaffleCellCounts,
	resolveWaffleMax,
	computeWaffleLayout,
	resolveWaffleCellSize,
	fitWaffleCellSize,
	getWaffleCategoryInputs,
	computeWafflePanelRatios,
} from './waffle';
export type {
	WaffleDisplayMode,
	WaffleCategoryInput,
	WaffleCategoryMeta,
	WaffleCell,
	ComputeWaffleCellsArgs,
	ComputeWaffleCellsResult,
	ComputeWaffleLayoutArgs,
	WaffleLayout,
	WafflePanelValue,
	ResolveWaffleCellSizeArgs,
} from './waffle';
export {
	computeHeatMapTableCells,
	computeHeatMapTableLayout,
	createValueColorScale,
	resolveBinFill,
	resolveBinPaint,
	resolveSolidColor,
	getThresholdLegendLabels,
	mapScaleStyleKey,
	thresholdBinLabel,
	thresholdLabelFill,
	thresholdLegendItems,
} from './heatMapTable';
export type {
	HeatMapTableCell,
	ComputeHeatMapTableCellsArgs,
	ComputeHeatMapTableCellsResult,
	ComputeHeatMapTableLayoutArgs,
	HeatMapTableLayout,
	BinMarkPaint,
	CreateValueColorScaleArgs,
	ResolveBinPaintDefaults,
	ValueColorScale,
	ValueColorScaleMode,
	ThresholdLegendLanguage,
} from './heatMapTable';
export type {
	SmallMultiplesPanel,
	SmallMultiplesGroupPanel,
	SmallMultiplesSeries,
	SharedDomainOptions,
	PanelRect,
	ComputePanelRectsArgs,
	ComputePanelRectsResult,
	ComputeGridHeightArgs,
	ResolveEffectiveColumnsArgs,
	PanelLike,
	AxisTreatment,
	SmallMultiplesAxisTreatment,
	PanelOrientation,
	PlanPanelAxesArgs,
	PanelAxisPlan,
	ColumnBarRect,
	ComputeColumnBarRectsArgs,
	HorizontalBarRect,
	ComputeHorizontalBarRectsArgs,
	ComputeBarPanelHeightArgs,
	ResolveGhostStrokeArgs,
	ResolvedGhostPaint,
} from './smallMultiples';

// Label layout engine (framework-agnostic)
export {
	computeLabelDeclutter,
	forceRectCollide,
	FIRST_LAST_OUTSIDE_BASE_DX,
	buildLineChartLabelId,
	buildLineChartLabelInputs,
	getFirstLastLabelPlacement,
	getLineLabelContent,
	buildOnLineSeriesLabelId,
	buildOnLineSeriesLabels,
	getDirectLabelOffsetFromCustom,
	getDirectLabelScaleFactors,
	getSeriesYAtPixelX,
	hasAuthorDirectLabelOverride,
	buildAllDotPlotLabelInputs,
	buildDotPlotLabelId,
	buildScatterLabelId,
	buildScatterLabelInputs,
	buildChartLabelId,
	getLabelMaxWidth,
	hasAuthorLabelOverride,
	getStackedSeriesDependentValue,
	computeLeaderLineEndpoints,
	rectEdgeTowardPoint,
	createLeaderLineStore,
	measureLabelBBox,
	measureTextWidth,
	wordWrap,
	wrapRichText,
	resolveVerticalStacks,
} from './labelLayout';
export type {
	OnLineSeriesDeclutterInput,
	DotPlotGroupPosition,
	LeaderLineRegistration,
	LeaderLineStore,
	LabelBBox,
	MeasureLabelBBoxOptions,
	ResolveVerticalStacksOptions,
	StackItem,
} from './labelLayout';

// Unified tooltip (per-x column model)
export * from './unifiedTooltip';

// Compute (headless prop + data builders)
export {
	getSharedProps,
	getAria,
	getAxisProps,
	getGridProps,
	getLabelFormat,
	getLabelProps,
	positionBarLabel,
	getLegendProps,
	getLineProps,
	getChartDimensions,
	getLocalPoint,
	svgUserPointToViewport,
	getTooltipFormat,
	getTooltipHeaderFormat,
	getTooltipVisible,
	getTooltipMapDeemphasisProps,
	tooltipFormatPoint,
	getTextVisible,
	getVoronoiProps,
	getFlattenedData,
	getRowDisplayText,
	selectPlotRows,
	canonicalRowValue,
	getGroupedData,
	getGroupColorDomain,
	createGroupBandScale,
	linearBarSpan,
	linearBarBaseline,
	domainCrossesZero,
	getGroupPositioningHorizontal,
	getGroupPositioningVertical,
	getGroupPositioningPie,
	resolveNodeShapeColors,
	buildBeeswarmGroupCenters,
	computeBeeswarmForce,
} from './compute';
export type {
	GroupedData,
	GroupPositioning,
	PieGroupPositioning,
} from './compute/data';
