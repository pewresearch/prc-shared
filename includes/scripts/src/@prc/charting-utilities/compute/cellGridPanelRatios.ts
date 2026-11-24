export type WafflePanelValue = {
	key: string;
	value: number;
};

export function computeWafflePanelRatios(
	panels: WafflePanelValue[]
): Map<string, number> {
	const total = panels.reduce((sum, panel) => sum + Math.abs(panel.value), 0);
	if (total <= 0) {
		return new Map(panels.map((panel) => [panel.key, 0]));
	}

	return new Map(
		panels.map((panel) => [
			panel.key,
			(Math.abs(panel.value) / total) * 100,
		])
	);
}
