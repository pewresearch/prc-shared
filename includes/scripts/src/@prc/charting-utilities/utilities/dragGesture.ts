/**
 * One editor drag gesture on a chart element: a label, an annotation, a
 * legend item, a drawing, or a selection handle.
 *
 *   idle --press--> pressed --move(non-zero)--> dragging
 *   pressed | dragging --release--> idle (moved kept for the click)
 *   pressed | dragging --cancel--> idle (moved cleared; no click follows)
 *   any --click--> same phase, moved cleared
 *
 * The browser fires `click` after `mouseup`, so `moved` must outlive
 * `release`: the click that ends a drag reads it to swallow the popover.
 * `press` clears it, so a click that never reached the element cannot
 * swallow the next one. Prop sync is held while the phase is not idle.
 *
 * Model: tests/prc-charting-library/formal/drag-gestures/DragGesture.tla.
 */

export type DragGesturePhase = 'idle' | 'pressed' | 'dragging';

export interface DragGestureState {
	phase: DragGesturePhase;
	/** A non-zero move happened since the last press. */
	moved: boolean;
}

export type DragGestureEvent =
	| { type: 'press' }
	| { type: 'move'; dx: number; dy: number }
	| { type: 'release' }
	| { type: 'cancel' }
	| { type: 'click' };

export const DRAG_GESTURE_IDLE: DragGestureState = Object.freeze({
	phase: 'idle',
	moved: false,
});

/**
 * Next gesture state for one pointer or click event.
 *
 * @param state Current state.
 * @param event Pointer or click event.
 * @return Next state.
 */
export function stepDragGesture(
	state: DragGestureState,
	event: DragGestureEvent
): DragGestureState {
	switch (event.type) {
		case 'press':
			return { phase: 'pressed', moved: false };
		case 'move':
			if (state.phase === 'idle' || (event.dx === 0 && event.dy === 0)) {
				return state;
			}
			return { phase: 'dragging', moved: true };
		case 'release':
			return state.phase === 'idle'
				? state
				: { phase: 'idle', moved: state.moved };
		case 'cancel':
			return DRAG_GESTURE_IDLE;
		case 'click':
			return state.moved ? { phase: state.phase, moved: false } : state;
		default: {
			const unhandled: never = event;
			return unhandled;
		}
	}
}

/**
 * Whether props may overwrite the element's local drag position.
 *
 * @param state Current state.
 */
export function dragGestureAllowsSync(state: DragGestureState): boolean {
	return state.phase === 'idle';
}

/**
 * Releases pointer capture without throwing. `releasePointerCapture` throws
 * `NotFoundError` once the pointer is no longer active (a touch after
 * pointercancel), and a throw would skip the drag-end callback after it.
 *
 * @param target    Element that may hold the capture.
 * @param pointerId Pointer to release.
 */
export function releasePointerCaptureSafely(
	target: EventTarget | null,
	pointerId: number
): void {
	const element = target as Element | null;
	try {
		if (element?.hasPointerCapture?.(pointerId)) {
			element.releasePointerCapture(pointerId);
		}
	} catch {
		// The capture is already gone.
	}
}
