"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GroceryItem } from "../../lib/groceries/model";
import type { GroceryRequest } from "../../lib/groceries/client";

export function useGroceryItems(request: GroceryRequest) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError("");
    try {
      const result = await request("GET");
      if (current === generation.current) setItems((result.items ?? []) as GroceryItem[]);
    } catch (error) {
      if (current === generation.current) setError(error instanceof Error ? error.message : "Groceries could not load.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [request]);
  useEffect(() => {
    setItems([]);
    void reload();
    const refresh = () => { if (document.visibilityState === "visible") void reload(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    // Refresh date badges across midnight while this page stays open.
    const timer = setInterval(refresh, 60_000);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);
  return { items, loading, error, reload };
}
