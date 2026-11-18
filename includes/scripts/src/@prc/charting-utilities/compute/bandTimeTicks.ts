import { newDateByFormat } from '../utilities/helpers';

type BandScale = { bandwidth: () => number; domain: () => unknown[] };

const isBandScale = (scale: unknown): scale is BandScale =>
	!!scale && 'bandwidth' in (scale as object);

const toTime = (value: unknown, inputDateFormat?: string | null) =>
	(value instanceof Date
		? value
		: newDateByFormat(String(value), inputDateFormat)
	).getTime();

/**
 * Specific time ticks as band domain entries. A band scale only places its
 * own entries, so each tick becomes the column with the same date, and a tick
 * that names no column is dropped.
 *
 * @param tickValues      Requested ticks, e.g. ['2009', '2023'].
 * @param scale           Band scale whose domain holds the columns.
 * @param inputDateFormat Format the ticks and string entries are written in.
 */
const bandTimeTicks = (
	tickValues: ReadonlyArray<string | number | Date>,
	scale: BandScale,
	inputDateFormat?: string | null
) => {
	const entryByTime = new Map<number, unknown>();
	for (const entry of scale.domain()) {
		const time = toTime(entry, inputDateFormat);
		if (!Number.isNaN(time) && !entryByTime.has(time)) {
			entryByTime.set(time, entry);
		}
	}
	return tickValues
		.map((tick) => entryByTime.get(toTime(tick, inputDateFormat)))
		.filter((entry) => entry !== undefined) as string[];
};

export { bandTimeTicks, isBandScale };
