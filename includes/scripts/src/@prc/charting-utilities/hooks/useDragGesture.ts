import { useMemo, useRef } from 'react';
import {
	DRAG_GESTURE_IDLE,
	dragGestureAllowsSync,
	stepDragGesture,
	type DragGestureEvent,
	type DragGestureState,
} from '../utilities/dragGesture';

/** `ignored`: no movement, or no press. `first`: the move that starts the drag. */
export type DragMoveResult = 'ignored' | 'first' | 'continued';

export interface DragGesture {
	/** `onStart` / `pointerdown`. */
	press: () => void;
	/** `onDrag` / `pointermove` with the delta since the last event. */
	move: (dx: number, dy: number) => DragMoveResult;
	/** `onStop` / `pointerup`. Returns true when the gesture moved. */
	release: () => boolean;
	/** `pointercancel` / `lostpointercapture`. Returns true when a press was open. */
	cancel: () => boolean;
	/** `click`. Returns true when the click ends a drag and must be swallowed. */
	consumeClick: () => boolean;
	/** True while props must not overwrite the local drag position. */
	isActive: () => boolean;
}

/**
 * Ref-backed `stepDragGesture` for one draggable element. Reads are
 * synchronous, so a handler sees the state the previous event left even when
 * React has not rendered in between.
 *
 * @return Stable gesture handle.
 */
export function useDragGesture(): DragGesture {
	const stateRef = useRef<DragGestureState>(DRAG_GESTURE_IDLE);

	return useMemo<DragGesture>(() => {
		const send = (event: DragGestureEvent): DragGestureState => {
			const previous = stateRef.current;
			stateRef.current = stepDragGesture(previous, event);
			return previous;
		};
		return {
			press: () => {
				send({ type: 'press' });
			},
			move: (dx, dy) => {
				const previous = send({ type: 'move', dx, dy });
				if (stateRef.current === previous) {
					return 'ignored';
				}
				return previous.phase === 'pressed' ? 'first' : 'continued';
			},
			release: () => send({ type: 'release' }).moved,
			cancel: () => send({ type: 'cancel' }).phase !== 'idle',
			consumeClick: () => send({ type: 'click' }).moved,
			isActive: () => !dragGestureAllowsSync(stateRef.current),
		};
	}, []);
}
