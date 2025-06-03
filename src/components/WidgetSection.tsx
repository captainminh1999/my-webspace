import React from "react";

interface WidgetSectionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Basic wrapper used inside widget modals. Provides consistent
 * spacing, padding and background styling across widgets.
 */
const WidgetSection: React.FC<WidgetSectionProps> = ({ children, className = "" }) => (
  <div className={`p-4 rounded-lg bg-gray-50 dark:bg-gray-700 ${className}`.trim()}>
    {children}
  </div>
);

export default WidgetSection;
