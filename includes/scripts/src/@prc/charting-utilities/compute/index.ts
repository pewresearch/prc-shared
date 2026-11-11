// shared hooks
import React from 'react';
import { getAria } from './aria';
import { getAxisProps } from './axes';
import { getGridProps } from './grid';
import { getLabelFormat, getLabelProps, positionBarLabel } from './labels';
import { getLegendProps } from './legend';
import { getLineProps } from './line';
import { getChartDimensions } from './size';
import {
	getLocalPoint,
	svgUserPointToViewport,
	getTooltipFormat,
	getTooltipHeaderFormat,
	getTooltipVisible,
	getTooltipMapDeemphasisProps,
	tooltipFormatPoint,
} from './tooltips';
import { resolveNodeShapeColors } from './nodes';
import {
	buildBeeswarmGroupCenters,
	computeBeeswarmForce,
} from './beeswarmForce';
import { getVoronoiProps } from './voronoi';
import type { FlatData } from '../types/flatData';
import type { TableData } from '../types/tableData';
import type { BaseConfig } from '../types/configTypes';
import type { Size } from '../types/windowSize';
import { getTextVisible } from './text';
import {
	getFlattenedData,
	getRowDisplayText,
	getGroupedData,
	createGroupBandScale,
	getGroupPositioningHorizontal,
	getGroupPositioningVertical,
	getGroupPositioningPie,
} from './data';
import { getGroupColorDomain } from './groupColorDomain';
import { linearBarSpan, linearBarBaseline } from './linearBarSpan';
import { domainCrossesZero } from './domainCrossesZero';

type SharedProps = {
	config: BaseConfig;
	data: FlatData | any;
	size: Size;
	tableData?: TableData;
	chartType: string;
	dependentScale?: any;
	independentScale?: any;
	actualContentHeight?: number;
	independentTicksComponent?: (props: any) => React.ReactElement;
	dependentTicksComponent?: (props: any) => React.ReactElement;
};

const getSharedProps = ({
	config,
	data,
	size,
	tableData,
	chartType,
	dependentScale,
	independentScale,
	actualContentHeight,
	independentTicksComponent,
	dependentTicksComponent,
}: SharedProps) => {
	const {
		dependentAxis,
		independentAxis,
		layout,
		tooltip,
		annotations,
		labels,
		legend,
		diffColumn,
		voronoi,
		metadata,
	} = config;
	const { chartWidth, innerWidth, innerHeight } = getChartDimensions(
		size,
		layout,
		diffColumn
	);
	const { alt } = metadata;

	// Use actualContentHeight for grid height if provided (for grouped charts)
	const gridHeight = actualContentHeight || innerHeight;

	return {
		ariaProps: getAria({ chartType, data, tableData, alt }),
		labelProps: getLabelProps(labels),
		legendProps: getLegendProps(legend),
		voronoiProps: getVoronoiProps(voronoi),
		dependentAxisProps: getAxisProps(
			dependentAxis,
			dependentScale,
			config.dataRender.yFormat,
			dependentTicksComponent
		),
		independentAxisProps: getAxisProps(
			independentAxis,
			independentScale,
			config.dataRender.xFormat,
			independentTicksComponent
		),
		dependentGridProps: getGridProps(
			dependentAxis,
			dependentScale,
			innerWidth,
			gridHeight
		),
		independentGridProps: getGridProps(
			independentAxis,
			independentScale,
			innerWidth,
			gridHeight
		),
		tooltipVisible: getTooltipVisible(layout, chartWidth, tooltip),
		annotationsVisible: getTextVisible(layout, chartWidth, annotations),
		chartWidth,
		innerWidth,
		innerHeight,
		actualContentHeight: gridHeight,
	};
};

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
	getTextVisible,
	getVoronoiProps,
	getFlattenedData,
	getRowDisplayText,
	getGroupedData,
	getGroupColorDomain,
	createGroupBandScale,
	linearBarSpan,
	linearBarBaseline,
	domainCrossesZero,
	getGroupPositioningHorizontal,
	getGroupPositioningVertical,
	getGroupPositioningPie,
	getTooltipMapDeemphasisProps,
	tooltipFormatPoint,
	resolveNodeShapeColors,
	buildBeeswarmGroupCenters,
	computeBeeswarmForce,
};

export { canonicalRowValue, selectPlotRows } from './selectPlotRows';
