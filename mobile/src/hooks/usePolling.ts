import { useEffect, useRef, useCallback } from 'react';

/**
 * Polls `fn` immediately, then every `intervalMs` milliseconds.
 * Stops polling when the component unmounts.
 */
export function usePolling(fn: () => void | Promise<void>, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function tick() {
      if (!cancelled) {
        await fnRef.current();
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, enabled]);
}
