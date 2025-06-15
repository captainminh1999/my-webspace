"use client";
import { useEffect, useState } from "react";
import { fetchWidgetData, getCachedWidget } from "./widgetData";

export interface WidgetState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useWidgetData<T = unknown>(id: string): WidgetState<T> {
  const cached = getCachedWidget(id);
  const [state, setState] = useState<WidgetState<T>>(() => {
    if (cached instanceof Error) {
      return { data: null, loading: false, error: cached };
    }
    if (cached !== undefined) {
      return { data: cached as T, loading: false, error: null };
    }
    return { data: null, loading: true, error: null };
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchWidgetData<T>(id)
      .then((d) => {
        if (!cancelled) setState({ data: d, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load widget data", err);
          setState({ data: null, loading: false, error: err });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
