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
export * from './types/hemicycle';

// React hooks
export { useSize } from './hooks/useSize';
export {
	useSeriesMask,
	useDismissTooltipOnSeriesMask,
} from './hooks/useSeriesMask';
export type { UseSeriesMaskInput } from './hooks/useSeriesMask';
export { useDarkMode } from './hooks/useDarkMode';
export { useLocalStorage } from './hooks/useLocalStorage';
export { useMedia } from './hooks/useMedia';
export {
	useRegressionLine,
	useRegressionLines,
} from './hooks/useRegressionLine';
export { useWorldCountryData } from './hooks/useWorldCountryData';
export type {
	UseWorldCountryDataArgs,
	UseWorldCountryDataResult,
} from './hooks/useWorldCountryData';
export {
	useStateData,
	useStateGridData,
	findStateDataRow,
	fipsToStateAbbr,
} from './hooks/useStateData';
export type {
	UseStateDataArgs,
	UseStateDataResult,
	UseStateGridDataArgs,
	StateGridBin,
	StateGridColumn,
} from './hooks/useStateData';

// Pure utilities
export { DEFAULT_FONT_FAMILY } from './utilities/defaultFontFamily';
export { default as baseConfig } from './utilities/baseConfig';
export { orderRows } from './utilities/orderRows';
export type { OrderRowsOptions } from './utilities/orderRows';
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
export { readPlotBandLabelRotation } from './utilities/plotBandLabel';
export type { PlotBandLabelStyle } from './utilities/plotBandLabel';
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
export {
	alignItemsFromVerticalAnchor,
	cssTextAlignFromAnchor,
	dominantBaselineFromVerticalAnchor,
	legendLabelTextStyle,
	resolveLegendTextAnchor,
} from './utilities/legendTextLayout';
export type {
	LegendTextAnchor,
	LegendTextLayoutInput,
	LegendVerticalAnchor,
} from './utilities/legendTextLayout';
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
export { resolveGhostStroke } from './utilities/resolveGhostStroke';
export type {
	ResolveGhostStrokeArgs,
	ResolvedGhostPaint,
} from './utilities/resolveGhostStroke';

// Compute: shared props, axes, grid, legend, line, size, text, tooltips
export { getSharedProps } from './compute/sharedProps';
export { getAria } from './compute/aria';
export { getAxisProps } from './compute/axes';
export { getGridProps } from './compute/grid';
export {
	getLabelFormat,
	getLabelProps,
	positionBarLabel,
} from './compute/labels';
export { getLegendProps } from './compute/legend';
export { getLineProps } from './compute/line';
export { getChartDimensions } from './compute/size';
export { getTextVisible } from './compute/text';
export {
	getLocalPoint,
	svgUserPointToViewport,
	getTooltipFormat,
	getTooltipHeaderFormat,
	getTooltipVisible,
	getTooltipMapDeemphasisProps,
	tooltipFormatPoint,
} from './compute/tooltips';
export { getVoronoiProps } from './compute/voronoi';
export {
	buildUnifiedTooltipColumns,
	findNearestColumn,
} from './compute/unifiedTooltipColumns';
export type { BuildUnifiedTooltipColumnsOptions } from './compute/unifiedTooltipColumns';

// Compute: plot rows, groups, facets, domains
export {
	getFlattenedData,
	getRowDisplayText,
	getGroupedData,
	createGroupBandScale,
	getGroupPositioningHorizontal,
	getGroupPositioningVertical,
	getGroupPositioningPie,
} from './compute/data';
export type {
	GroupedData,
	GroupPositioning,
	PieGroupPositioning,
} from './compute/data';
export { selectPlotRows, canonicalRowValue } from './compute/selectPlotRows';
export { getGroupColorDomain } from './compute/groupColorDomain';
export { domainCrossesZero } from './compute/domainCrossesZero';
export { enrichFacetRow, isFacetMetaKey } from './compute/enrichFacetRow';
export {
	facetDataByColumn,
	deriveCategories,
	SMALL_MULTIPLES_SHARED_SERIES_KEY,
} from './compute/facetDataByColumn';
export type { SmallMultiplesPanel } from './compute/facetDataByColumn';
export { facetDataByGroup } from './compute/facetDataByGroup';
export type {
	SmallMultiplesGroupPanel,
	SmallMultiplesSeries,
} from './compute/facetDataByGroup';
export { sortPanelRowsByIndependent } from './compute/sortPanelRowsByIndependent';
export { computeSharedDomain } from './compute/sharedDomain';
export type { SharedDomainOptions } from './compute/sharedDomain';
export { resolveSliceDomain } from './compute/sliceDomain';
export { getWaffleCategoryInputs } from './compute/categoryInputs';

// Compute: panels
export {
	computePanelRects,
	computeGridHeight,
	resolveEffectiveColumns,
} from './compute/panelLayout';
export type {
	PanelRect,
	ComputePanelRectsArgs,
	ComputePanelRectsResult,
	ComputeGridHeightArgs,
	ResolveEffectiveColumnsArgs,
} from './compute/panelLayout';
export { resolvePanelRect } from './compute/panelRect';
export type { PanelLike } from './compute/panelRect';
export {
	getPositioningScale,
	scalePositionToDisplay,
	scalePositionToLayout,
} from './compute/positioningScale';
export type {
	PositioningContext,
	PositioningScale,
	LayoutPadding,
	PositioningLayout,
	GetPositioningScaleArgs,
} from './compute/positioningScale';
export { planPanelAxes } from './compute/panelAxes';
export type {
	AxisTreatment,
	PanelOrientation,
	PlanPanelAxesArgs,
	PanelAxisPlan,
} from './compute/panelAxes';
export type { SmallMultiplesAxisTreatment } from './types/smallMultiples';

// Compute: marks (bars, cells, seats, nodes)
export { linearBarSpan, linearBarBaseline } from './compute/linearBarSpan';
export {
	computeColumnBarRects,
	resolveBandDomain,
	computeHorizontalBarRects,
	computeBarPanelHeight,
} from './compute/barRects';
export type {
	ColumnBarRect,
	ComputeColumnBarRectsArgs,
	HorizontalBarRect,
	ComputeHorizontalBarRectsArgs,
	ComputeBarPanelHeightArgs,
} from './compute/barRects';
export {
	computeWaffleCells,
	allocateWaffleCellCounts,
	resolveWaffleMax,
} from './compute/cellGrid';
export type {
	WaffleDisplayMode,
	WaffleCategoryInput,
	WaffleCategoryMeta,
	WaffleCell,
	ComputeWaffleCellsArgs,
	ComputeWaffleCellsResult,
} from './compute/cellGrid';
export { computeWaffleLayout } from './compute/cellGridLayout';
export type {
	ComputeWaffleLayoutArgs,
	WaffleLayout,
} from './compute/cellGridLayout';
export { resolveWaffleCellSize, fitWaffleCellSize } from './compute/cellSize';
export type { ResolveWaffleCellSizeArgs } from './compute/cellSize';
export { computeWafflePanelRatios } from './compute/cellGridPanelRatios';
export type { WafflePanelValue } from './compute/cellGridPanelRatios';
export {
	computeHemicycleSeats,
	allocateHemicycleSeatCounts,
	resolveHemicycleRows,
} from './compute/seatArcs';
export type {
	HemicycleCategoryInput,
	HemicycleSeat,
	ComputeHemicycleSeatsArgs,
	ComputeHemicycleSeatsResult,
} from './compute/seatArcs';
export { computeHemicycleBarSegments } from './compute/seatBarSegments';
export type { HemicycleBarSegment } from './compute/seatBarSegments';
export { computeHemicycleSquareScale } from './compute/seatSquareScale';
export { hemicycleTooltipPoint } from './compute/seatTooltipPoint';
export { computeHeatMapTableCells } from './compute/tableCells';
export type {
	HeatMapTableCell,
	ComputeHeatMapTableCellsArgs,
	ComputeHeatMapTableCellsResult,
} from './compute/tableCells';
export { computeHeatMapTableLayout } from './compute/tableColumnLayout';
export type {
	ComputeHeatMapTableLayoutArgs,
	HeatMapTableLayout,
} from './compute/tableColumnLayout';
export { resolveNodeShapeColors } from './compute/nodes';
export {
	buildBeeswarmGroupCenters,
	computeBeeswarmForce,
} from './compute/beeswarmForce';

// Compute: value color scale and its legend labels
export {
	createValueColorScale,
	resolveBinFill,
	resolveBinPaint,
	resolveSolidColor,
} from './compute/valueColorScale';
export type {
	BinMarkPaint,
	CreateValueColorScaleArgs,
	ResolveBinPaintDefaults,
	ValueColorScale,
	ValueColorScaleMode,
} from './compute/valueColorScale';
export {
	getLinearRampStops,
	getThresholdLegendLabels,
	mapScaleStyleKey,
	thresholdBinLabel,
	thresholdLabelFill,
	thresholdLegendItems,
} from './compute/thresholdLegendLabels';
export type { ThresholdLegendLanguage } from './compute/thresholdLegendLabels';

// Label layout engine (framework-agnostic)
export { computeLabelDeclutter } from './labelLayout/computeLabelDeclutter';
export { forceRectCollide } from './labelLayout/forceRectCollide';
export {
	FIRST_LAST_OUTSIDE_BASE_DX,
	buildLineChartLabelId,
	buildLineChartLabelInputs,
	getFirstLastLabelPlacement,
	getLineLabelContent,
} from './labelLayout/buildLineChartLabels';
export {
	buildOnLineSeriesLabelId,
	buildOnLineSeriesLabels,
	getDirectLabelOffsetFromCustom,
	getDirectLabelScaleFactors,
	getSeriesYAtPixelX,
	hasAuthorDirectLabelOverride,
	getStackedSeriesDependentValue,
} from './labelLayout/buildOnLineSeriesLabels';
export type { OnLineSeriesDeclutterInput } from './labelLayout/buildOnLineSeriesLabels';
export {
	buildAllDotPlotLabelInputs,
	buildDotPlotLabelId,
	buildScatterLabelId,
	buildScatterLabelInputs,
} from './labelLayout/buildScatterLabels';
export type { DotPlotGroupPosition } from './labelLayout/buildScatterLabels';
export {
	buildChartLabelId,
	getLabelMaxWidth,
	hasAuthorLabelOverride,
} from './labelLayout/helpers';
export {
	computeLeaderLineEndpoints,
	rectEdgeTowardPoint,
} from './labelLayout/leaderLineGeometry';
export { createLeaderLineStore } from './labelLayout/leaderLineStore';
export type {
	LeaderLineRegistration,
	LeaderLineStore,
} from './labelLayout/leaderLineStore';
export {
	measureLabelBBox,
	measureTextWidth,
	wordWrap,
	wrapRichText,
} from './labelLayout/measureLabel';
export type {
	LabelBBox,
	MeasureLabelBBoxOptions,
} from './labelLayout/measureLabel';
export { resolveVerticalStacks } from './labelLayout/resolveVerticalStacks';
export type {
	ResolveVerticalStacksOptions,
	StackItem,
} from './labelLayout/resolveVerticalStacks';
