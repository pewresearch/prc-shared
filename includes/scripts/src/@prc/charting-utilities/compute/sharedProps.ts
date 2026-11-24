import React from 'react';
import { getAria } from './aria';
import { getAxisProps } from './axes';
import { getGridProps } from './grid';
import { getLabelProps } from './labels';
import { getLegendProps } from './legend';
import { getChartDimensions } from './size';
import { getTooltipVisible } from './tooltips';
import { getVoronoiProps } from './voronoi';
import { getTextVisible } from './text';
import type { FlatData } from '../types/flatData';
import type { TableData } from '../types/tableData';
import type { BaseConfig } from '../types/configTypes';
import type { Size } from '../types/windowSize';

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

export const getSharedProps = ({
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
			gridHeight,
			config.dataRender.xFormat
		),
		tooltipVisible: getTooltipVisible(layout, chartWidth, tooltip),
		annotationsVisible: getTextVisible(layout, chartWidth, annotations),
		chartWidth,
		innerWidth,
		innerHeight,
		actualContentHeight: gridHeight,
	};
};
