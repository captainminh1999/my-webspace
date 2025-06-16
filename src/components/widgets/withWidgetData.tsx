"use client";
import React from "react";
import Skeleton from "@/components/Skeleton";
import { useWidgetData } from "@/lib/useWidgetData";

interface Options {
  loadingHeight?: string;
  errorPadding?: string;
}

/**
 * Higher-order component for loading widget data.
 * Wraps a component that expects a `data` prop.
 */
export function withWidgetData<T>(
  id: string,
  { loadingHeight = "h-24", errorPadding = "p-2" }: Options = {}
) {
  return function <P extends object>(
    Component: React.ComponentType<P & { data: T }>
  ): React.FC<P> {
    const Wrapped: React.FC<P> = (props) => {
      const { data, loading, error } = useWidgetData<T>(id);
      if (loading)
        return (
          <div className={`relative ${loadingHeight}`}>
            <Skeleton />
          </div>
        );
      if (error) return <div className={`${errorPadding} text-sm`}>Failed to load</div>;
      if (!data) return null;
      return <Component {...props} data={data} />;
    };
    return Wrapped;
  };
}
