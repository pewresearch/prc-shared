import type { PanelRect } from './panelLayout';

export type PanelLike = {
	key: string;
};

/**
 * Look up the current panel cell rect by panel key (column header or group value).
 * Index-aligned with `panels` / `rects` from computePanelRects — survives restack.
 * @param root0
 * @param root0.panels
 * @param root0.rects
 * @param root0.panelKey
 */
export function resolvePanelRect({
	panels,
	rects,
	panelKey,
}: {
	panels: PanelLike[] | null | undefined;
	rects: PanelRect[] | null | undefined;
	panelKey: string | null | undefined;
}): PanelRect | null {
	if (
		!panelKey ||
		!Array.isArray(panels) ||
		!Array.isArray(rects) ||
		!panels.length ||
		!rects.length
	) {
		return null;
	}
	const index = panels.findIndex(
		(panel) => String(panel.key) === String(panelKey)
	);
	if (index < 0) {
		return null;
	}
	return rects[index] ?? null;
}
