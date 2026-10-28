'use client';
import { useRef } from 'react';

const SWIPE_PX = 60;

/**
 * Shared by both shopping-list surfaces (not the meal planner's own toast,
 * which doesn't sit over a fixed footer and wasn't reported as a problem).
 * The list's footer is now a fixed flex child rather than flowing content,
 * so a toast sitting on top of it for the full duration blocked the add
 * form underneath — shortened timeout plus a swipe to dismiss early, both
 * requested directly rather than guessed at.
 */
export default function UndoToast({ message, onUndo, onDismiss }) {
  const startX = useRef(null);

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > SWIPE_PX) onDismiss();
  };

  return (
    <div className="mp-toast" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <span>{message}</span>
      <button className="mp-toast__undo" onClick={onUndo}>Undo</button>
    </div>
  );
}
