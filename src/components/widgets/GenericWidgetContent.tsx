// src/components/widgets/GenericWidgetContent.tsx
import React from "react";

interface Props {
  title: string;
}

const GenericWidgetContent: React.FC<Props> = ({ title }) => (
  <div className="p-4 h-full flex flex-col items-center justify-center text-center select-none">
    <h3 className="font-bold text-sm mb-1 text-gray-800 dark:text-gray-200">
      {title}
    </h3>
    <p className="text-xs text-gray-500 dark:text-gray-400">
      Content for <span className="italic">{title}</span> will load…
    </p>
  </div>
);

export default GenericWidgetContent;
