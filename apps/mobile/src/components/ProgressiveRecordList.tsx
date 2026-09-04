import { useState, type ReactNode } from "react";

import { nextProgressiveLimit } from "./progressive-list-model";

type Props<T> = {
  initialCount: number;
  items: T[];
  noun: string;
  pageSize?: number;
  renderItem: (item: T) => ReactNode;
};

export function ProgressiveRecordList<T>({
  initialCount,
  items,
  noun,
  pageSize = initialCount,
  renderItem,
}: Props<T>) {
  const [limit, setLimit] = useState(initialCount);
  const visible = items.slice(0, limit);
  const remaining = Math.max(0, items.length - visible.length);

  return (
    <>
      {visible.map(renderItem)}
      {remaining ? (
        <button
          type="button"
          className="progressive-list-more"
          aria-label={`Show more ${noun}. ${visible.length} of ${items.length} shown.`}
          onClick={() => setLimit((current) =>
            nextProgressiveLimit(current, pageSize, items.length))}
        >
          Show {Math.min(pageSize, remaining)} more · {visible.length} of {items.length} {noun}
        </button>
      ) : null}
    </>
  );
}
