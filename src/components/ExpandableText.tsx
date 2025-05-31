// src/components/ExpandableText.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ExpandableTextProps {
  text: string;
  lineClamp?: number; // Number of lines to show before truncating
  className?: string; // Allow passing additional class names for the text container
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, lineClamp = 2, className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  const checkOverflow = useCallback(() => {
    const element = textRef.current;
    if (element) {
      // Ensure element is in its clamped state for measurement
      // by applying line-clamp styles directly if not expanded.
      // This is more reliable than toggling classes for measurement.
      if (!isExpanded) {
        element.style.display = '-webkit-box';
        element.style.webkitBoxOrient = 'vertical';
        element.style.webkitLineClamp = `${lineClamp}`;
        element.style.overflow = 'hidden';
      } else {
        // Ensure it's fully shown if expanded
        element.style.display = ''; // Or 'block', 'inline' etc. based on original display
        element.style.webkitBoxOrient = '';
        element.style.webkitLineClamp = 'unset';
        element.style.overflow = '';
      }

      // Check for overflow
      const doesOverflow = element.scrollHeight > element.clientHeight;
      setIsOverflowing(doesOverflow);
    }
  }, [lineClamp, isExpanded]); // isExpanded is needed so that when it becomes true, styles are correctly removed

  useEffect(() => {
    // Initial check and on text/lineClamp change
    // A small delay can help ensure the browser has rendered the text for accurate measurement
    const timer = setTimeout(() => {
      checkOverflow();
    }, 50); // Adjust delay if needed, or try 0 for next tick

    window.addEventListener('resize', checkOverflow);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text, lineClamp, checkOverflow]); // checkOverflow is now a dependency

  // Effect to re-apply styles when isExpanded changes
  useEffect(() => {
    const element = textRef.current;
    if (element) {
      if (isExpanded) {
        element.style.display = '';
        element.style.webkitBoxOrient = '';
        element.style.webkitLineClamp = 'unset';
        element.style.overflow = '';
      } else {
        // If it's not expanded, checkOverflow will re-apply clamp if needed
        // or we can re-apply it here if isOverflowing is true
        if (isOverflowing) {
            element.style.display = '-webkit-box';
            element.style.webkitBoxOrient = 'vertical';
            element.style.webkitLineClamp = `${lineClamp}`;
            element.style.overflow = 'hidden';
        }
      }
    }
  }, [isExpanded, isOverflowing, lineClamp]);


  const handleSeeMore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsExpanded(true); // Only expand, no "see less"
  };

  return (
    <div>
      <p
        ref={textRef}
        className={`${className} whitespace-pre-line`}
        // Initial styles are set by useEffect/checkOverflow
      >
        {text}
      </p>
      {isOverflowing && !isExpanded && (
        <div className="text-right -mt-1"> {/* Negative margin to pull it up slightly if desired */}
          <button
            onClick={handleSeeMore}
            className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-semibold focus:outline-none bg-white dark:bg-gray-800 px-1 rounded" // Added slight bg for overlap
            aria-expanded="false" 
          >
            ...see more
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpandableText;
