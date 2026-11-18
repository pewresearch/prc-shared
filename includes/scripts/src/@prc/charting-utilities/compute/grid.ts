import { ScaleLinear, ScaleTime, ScaleBand, ScalePoint } from 'd3-scale';
import { independentAxis, dependentAxis } from '../types/configTypes';
import { bandTimeTicks, isBandScale } from './bandTimeTicks';

export const getGridProps = (
	config: independentAxis | dependentAxis,
	scale:
		| ScaleLinear<number, number>
		| ScaleTime<number, number>
		| ScaleBand<string>
		| ScalePoint<string>,
	width: number,
	height: number,
	inputDateFormat?: string | null
) => {
	const { stroke, strokeWidth, strokeOpacity, strokeDasharray } = config.grid;
	let tickValues: unknown[] | undefined = config.tickValues;
	if (config.scale === 'time' && config.tickValues) {
		tickValues = isBandScale(scale)
			? bandTimeTicks(config.tickValues, scale, inputDateFormat)
			: config.tickValues.map((t) => {
					const date = new Date(t);
					date.setDate(date.getDate() + 1);
					return date;
				});
	}
	return {
		scale,
		width,
		height,
		stroke,
		strokeWidth,
		strokeOpacity,
		strokeDasharray,
		numTicks: config.tickCount,
		tickValues: tickValues as number[],
	};
};
