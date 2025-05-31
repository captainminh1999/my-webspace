// src/app/page.tsx
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import Link from 'next/link';

// CSS Imports should be in globals.css or layout.tsx as discussed:
// @import 'react-grid-layout/css/styles.css';
// @import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetItem {
  id: string;
  title: string;
  defaultSize: { w: number; h: number; minW?: number; minH?: number; maxW?: number; maxH?: number };
  content?: React.ReactNode; 
}

const CVLinkWidget: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
    <h3 className="text-lg font-semibold">Minh (Jose) Nguyen</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Data Management Specialist @ NEXTGEN oSpace</p>
    <Link href="/about-me" className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition duration-150">
      View Full CV
    </Link>
  </div>
);

const GenericWidgetContent: React.FC<{ title: string, defaultHeight: number }> = ({ title, defaultHeight }) => (
  <div className="p-4 h-full flex flex-col items-center justify-center text-center">
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-gray-500">Content for {title} widget will go here.</p>
  </div>
);

const initialWidgets: WidgetItem[] = [
  { id: 'cvLink', title: 'My Profile/CV', defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW:1, maxH:1 }, content: <CVLinkWidget /> },
  { id: 'coffee', title: 'Coffee Corner', defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW:2, maxH:2 } },
  { id: 'weather', title: 'Weather', defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW:2, maxH:1 } },
  { id: 'space', title: 'Space News', defaultSize: { w: 1, h: 2, minW: 1, minH: 1, maxW:2, maxH:2 } },
  { id: 'tech', title: 'Tech Updates', defaultSize: { w: 1, h: 2, minW: 1, minH: 1, maxW:2, maxH:2 } },
  { id: 'youtube', title: 'YouTube Recs', defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW:2, maxH:2 } },
  { id: 'drones', title: 'Drones', defaultSize: { w: 1, h: 1, minW: 1, minH:1, maxW:2, maxH:2 } },
  { id: 'camera', title: 'Photography', defaultSize: { w: 1, h: 1, minW: 1, minH:1, maxW:2, maxH:2 } },
  { id: 'games', title: 'Gaming', defaultSize: { w: 1, h: 1, minW: 1, minH:1, maxW:2, maxH:2 } }, 
  { id: "visitorEmotion", title: "How are you feeling?", defaultSize: { w: 1, h: 1, minW:1, minH:1, maxW:1, maxH:1 } },
];

const breakpointsConfig = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const colsConfig = { lg: 3, md: 3, sm: 1, xs: 1, xxs: 1 };

const getDefaultLayoutForBreakpoint = (breakpointWidgets: WidgetItem[], numCols: number): Layout[] => {
  const layout: Layout[] = [];
  if (numCols > 1) {
    let col = 0;
    let y = 0;
    breakpointWidgets.forEach((widget) => {
      const w = Math.min(widget.defaultSize.w, numCols);
      const h = widget.defaultSize.h;
      if (col + w > numCols) { 
        col = 0;
        y++; 
      }
      layout.push({
        i: widget.id, x: col, y: y, w: w, h: h,
        minW: widget.defaultSize.minW || 1, minH: widget.defaultSize.minH || 1,
        maxW: Math.min(widget.defaultSize.maxW || numCols, numCols),
        maxH: widget.defaultSize.maxH || 2,
        isResizable: true, isDraggable: true,
      });
      col += w;
    });
  } else { 
    breakpointWidgets.forEach((widget, index) => {
      layout.push({
        i: widget.id, x: 0, y: index * widget.defaultSize.h, 
        w: 1, h: widget.defaultSize.h,
        minW: 1, minH: widget.defaultSize.minH || 1,
        maxW: 1, maxH: widget.defaultSize.maxH || 2,
        isResizable: false, isDraggable: true,
      });
    });
  }
  return layout;
};

const generateAllDefaultLayouts = (): Layouts => {
  const layouts: Layouts = {};
  for (const bp in breakpointsConfig) {
    if (Object.prototype.hasOwnProperty.call(breakpointsConfig, bp)) {
      layouts[bp] = getDefaultLayoutForBreakpoint(initialWidgets, colsConfig[bp as keyof typeof colsConfig]);
    }
  }
  return layouts;
};


export default function NewHomePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [layouts, setLayouts] = useState<Layouts>(generateAllDefaultLayouts());

  useEffect(() => {
    setIsMounted(true); 
    const savedLayoutsString = localStorage.getItem('dashboardLayouts');
    let finalLayoutsToSet = generateAllDefaultLayouts(); 

    if (savedLayoutsString) {
      try {
        const parsedLayoutsFromStorage = JSON.parse(savedLayoutsString) as Layouts;
        const currentWidgetIds = new Set(initialWidgets.map(w => w.id));
        const tempValidatedLayouts: Layouts = { ...finalLayoutsToSet }; 

        for (const breakpointKey in parsedLayoutsFromStorage) { 
            if (Object.prototype.hasOwnProperty.call(parsedLayoutsFromStorage, breakpointKey) && 
                Object.prototype.hasOwnProperty.call(colsConfig, breakpointKey as keyof typeof colsConfig)
            ) {
                const layoutArray = parsedLayoutsFromStorage[breakpointKey];
                if (Array.isArray(layoutArray)) {
                    const validSavedItems = layoutArray.filter((item: any) => 
                        typeof item === 'object' && item !== null &&
                        typeof item.i === 'string' &&
                        currentWidgetIds.has(item.i) && 
                        typeof item.x === 'number' && typeof item.y === 'number' &&
                        typeof item.w === 'number' && typeof item.h === 'number'
                    ).map((item: any) => { 
                        const widgetConfig = initialWidgets.find(w=>w.id === item.i)!;
                        const numColsForBp = colsConfig[breakpointKey as keyof typeof colsConfig];
                        return { 
                            i: item.i, x: item.x, y: item.y, w: item.w, h: item.h,
                            minW: item.minW ?? widgetConfig.defaultSize.minW ?? 1,
                            minH: item.minH ?? widgetConfig.defaultSize.minH ?? 1,
                            maxW: item.maxW ?? widgetConfig.defaultSize.maxW ?? (numColsForBp === 1 ? 1 : 2),
                            maxH: item.maxH ?? widgetConfig.defaultSize.maxH ?? 2,
                            isDraggable: typeof item.isDraggable === 'boolean' ? item.isDraggable : true, 
                            isResizable: typeof item.isResizable === 'boolean' ? item.isResizable : (numColsForBp > 1),
                            static: typeof item.static === 'boolean' ? item.static : false,
                            isBounded: typeof item.isBounded === 'boolean' ? item.isBounded : undefined,
                        };
                    });
                    
                    const savedItemIds = new Set(validSavedItems.map(l => l.i));
                    const defaultBreakpointLayout = finalLayoutsToSet[breakpointKey as keyof typeof colsConfig] || []; // Ensure it's an array

                    // MODIFIED: Explicitly type defaultItem as Layout
                    const itemsToAddFromDefault = defaultBreakpointLayout.filter((defaultItem: Layout) => !savedItemIds.has(defaultItem.i));
                    
                    if (validSavedItems.length > 0 || itemsToAddFromDefault.length > 0) {
                       tempValidatedLayouts[breakpointKey as keyof typeof colsConfig] = [...validSavedItems, ...itemsToAddFromDefault];
                    } else {
                        console.warn(`No valid saved items for breakpoint ${breakpointKey}, using default.`);
                    }
                }
            }
        }
        finalLayoutsToSet = tempValidatedLayouts;
      } catch (e) {
        console.error("Error processing saved layouts. Using all defaults.", e);
        finalLayoutsToSet = generateAllDefaultLayouts(); 
      }
    }
    setLayouts(finalLayoutsToSet);
  }, []); 

  const onLayoutChange = useCallback((currentLayout: Layout[], allLayouts: Layouts) => {
    if (isMounted) { 
        const currentBreakpoint = Object.keys(allLayouts)[0] as keyof Layouts; 
        if (currentBreakpoint && layouts[currentBreakpoint] && JSON.stringify(allLayouts[currentBreakpoint]) !== JSON.stringify(layouts[currentBreakpoint])) {
             const newLayoutsToSave = {...layouts, ...allLayouts}; 
             localStorage.setItem('dashboardLayouts', JSON.stringify(newLayoutsToSave));
             setLayouts(newLayoutsToSave); 
        } else if (!currentBreakpoint && JSON.stringify(allLayouts) !== JSON.stringify(layouts)) { 
             localStorage.setItem('dashboardLayouts', JSON.stringify(allLayouts));
             setLayouts(allLayouts);
        }
    }
  }, [isMounted, layouts]);

  const resetLayout = () => {
    localStorage.removeItem('dashboardLayouts');
    const defaultLayouts = generateAllDefaultLayouts();
    setLayouts(defaultLayouts);
    setIsMounted(false);
    setTimeout(() => setIsMounted(true), 10); 
  };

  if (isMounted) {
    console.log("Current RGL Layouts Prop (passed to ResponsiveGridLayout):", JSON.stringify(layouts, null, 2));
  }

  if (!isMounted) {
    return <div className="flex justify-center items-center min-h-screen">Loading Dashboard...</div>;
  }
  
  return (
    <main className="p-4 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Dashboard</h1>
        <button
          onClick={resetLayout}
          className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-red-600 transition duration-150"
        >
          Reset Layout
        </button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts} 
        breakpoints={breakpointsConfig}
        cols={colsConfig}
        rowHeight={150} 
        onLayoutChange={onLayoutChange}
        isDraggable
        isResizable 
        compactType="vertical" 
        preventCollision={false} 
      >
        {initialWidgets.map(widget => (
          <div
            key={widget.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col" 
            data-grid={{ 
                i: widget.id, 
                w: widget.defaultSize.w, h: widget.defaultSize.h, 
                x:0, y:Infinity, 
                minW: widget.defaultSize.minW || 1, minH: widget.defaultSize.minH || 1,
                maxW: widget.defaultSize.maxW || 2, maxH: widget.defaultSize.maxH || 2,
            }}
          >
            <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move widget-drag-handle">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{widget.title}</h3>
            </div>
            <div className="widget-content flex-grow p-2"> 
              {widget.content || <GenericWidgetContent title={widget.title} defaultHeight={widget.defaultSize.h} />}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
      
      <div className="mt-8 p-4 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 rounded-md text-yellow-700 dark:text-yellow-200 text-sm">
        <p><strong>Note on React Grid Layout CSS:</strong> Ensure <code>react-grid-layout/css/styles.css</code> and <code>react-resizable/css/styles.css</code> are imported, e.g., in <code>globals.css</code>.</p>
        <pre className="mt-2 text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded"><code>
          @import 'react-grid-layout/css/styles.css';<br/>
          @import 'react-resizable/css/styles.css';
        </code></pre>
      </div>
    </main>
  );
}
