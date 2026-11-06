export type FlatData = {
	x: string | number | Date;
	y?: number;
	category?: string;
	x__label?: string;
	y__label?: string;
	y1?: number;
	y2?: number;
	y3?: number;
	y4?: number;
	isHighlighted?: boolean;
	/** Authored cell text, per column, when numeric coercion changed its form. */
	__raw?: Record<string, string>;
	/** Finished tooltip `{{value}}` text, per series, in place of the formatted number. */
	__displayValues?: Record<string, string>;
	label?: string;
	tooltip?: string;
	[propName: string]: any;
};
