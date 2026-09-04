type CoalescedSaver<T> = {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  dispose: () => void;
};

export function createCoalescedSaver<T>(
  save: (value: T) => Promise<void>,
  delayMs = 800,
): CoalescedSaver<T> {
  let latestValue: T | undefined;
  let hasPendingValue = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;
  let disposed = false;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const drain = async () => {
    clearTimer();
    if (running) return running;

    running = (async () => {
      while (hasPendingValue && !disposed) {
        const value = latestValue as T;
        hasPendingValue = false;
        try {
          await save(value);
        } catch (error) {
          // Retain the newest state. The next edit or explicit flush will retry it.
          hasPendingValue = true;
          throw error;
        }
      }
    })().finally(() => {
      running = null;
    });

    return running;
  };

  return {
    schedule(value) {
      if (disposed) return;
      latestValue = value;
      hasPendingValue = true;
      clearTimer();
      timer = setTimeout(() => {
        void drain().catch(() => undefined);
      }, Math.max(0, delayMs));
    },
    async flush() {
      if (disposed) return;
      await drain();
    },
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
