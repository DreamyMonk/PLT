"use client";

import { useRef, useState, useEffect, useMemo, FC } from 'react';
import { PltPlaceholder } from './plt-placeholder';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { UploadCloud } from 'lucide-react';

type OverlayState = {
  position: { x: number; y: number };
  size: number;
  rotation: number;
  opacity: number;
};

type ViewState = {
  zoom: number;
  pan: { x: number; y: number };
};

interface PltViewerProps {
  pltFile: File | null;
  overlayImage: string | null;
  overlayState: OverlayState;
  viewState: ViewState;
  onOverlayStateChange: (newState: Partial<OverlayState>) => void;
  onViewStateChange: (newState: Partial<ViewState>) => void;
}

export const PltViewer: FC<PltViewerProps> = ({
  pltFile,
  overlayImage,
  overlayState,
  viewState,
  onOverlayStateChange,
  onViewStateChange,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [pltContent, setPltContent] = useState<string | null>(null);

  // Interaction states
  const [interaction, setInteraction] = useState<'pan' | 'drag' | 'resize' | null>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0, overlayX: 0, overlayY: 0, overlaySize: 0 });

  useEffect(() => {
    if (pltFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPltContent(e.target?.result as string);
      };
      reader.readAsText(pltFile);
    } else {
      setPltContent(null);
    }
  }, [pltFile]);

  const { pathData, viewBox, imageSize } = useMemo(() => {
    if (!pltContent) return { pathData: null, viewBox: null, imageSize: { width: 0, height: 0 } };
    
    const commands = pltContent.split(';').filter(c => c.trim().length > 0);
    const d: string[] = [];
    let penDown = false;
    
    const coordsToBounds = (coords: {x: number, y: number}[]) => {
      if (coords.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const {x, y} of coords) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      return { minX, minY, maxX, maxY };
    }

    const allCoords: {x:number, y:number}[] = [];
    commands.forEach(cmd => {
      const op = cmd.substring(0, 2).toUpperCase();
      const args = (cmd.match(/(-?\d+)/g) || []).map(Number);
      if (op === 'PU' || op === 'PD' || op === 'PA') {
         for (let i = 0; i < args.length; i += 2) {
            if (args.length > i + 1) allCoords.push({x: args[i], y: args[i+1]});
         }
      }
    });
    
    const bounds = coordsToBounds(allCoords);
    const plotWidth = bounds.maxX - bounds.minX;
    const plotHeight = bounds.maxY - bounds.minY;

    if (plotWidth === 0 || plotHeight === 0) {
        return { pathData: null, viewBox: null, imageSize: { width: 0, height: 0 } };
    }
    
    const vb = `${bounds.minX} ${bounds.minY} ${plotWidth} ${plotHeight}`;

    let currentPos = { x: 0, y: 0 };
    for (const cmd of commands) {
      const op = cmd.substring(0, 2).toUpperCase();
      const args = (cmd.match(/(-?\d+)/g) || []).map(Number);

      switch (op) {
        case 'PU':
          penDown = false;
          if (args.length >= 2) {
            currentPos = { x: args[0], y: args[1] };
            d.push(`M ${currentPos.x} ${currentPos.y}`);
          }
          break;
        case 'PD':
          if (!penDown && d.length > 0 && !d[d.length - 1].startsWith('M')) {
            d.push(`M ${currentPos.x} ${currentPos.y}`);
          }
          penDown = true;
           if (args.length >= 2) {
             for (let i = 0; i < args.length; i+=2) {
                if (args.length > i + 1) {
                  currentPos = { x: args[i], y: args[i + 1] };
                  d.push(`L ${currentPos.x} ${currentPos.y}`);
                }
             }
          }
          break;
        case 'PA':
            if (args.length >= 2) {
                for (let i = 0; i < args.length; i+=2) {
                    if (args.length > i + 1) {
                        currentPos = { x: args[i], y: args[i+1] };
                        const op = penDown ? 'L' : 'M';
                        d.push(`${op} ${currentPos.x} ${currentPos.y}`);
                        penDown = true;
                    }
                }
            }
          break;
        case 'IN':
          d.length = 0;
          break;
      }
    }
    
    return { pathData: d.join(' '), viewBox: vb, imageSize: { width: plotWidth, height: plotHeight } };
  }, [pltContent]);

  const clipPathId = "plt-clip-path";

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as SVGElement;
    
    if (target.id === 'overlay-drag-handle') {
      setInteraction('drag');
    } else if (target.id === 'overlay-resize-handle') {
      setInteraction('resize');
    } else if (viewerRef.current && (target === viewerRef.current || target.closest('svg'))) {
      setInteraction('pan');
    } else {
        return;
    }

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: viewState.pan.x,
      panY: viewState.pan.y,
      overlayX: overlayState.position.x,
      overlayY: overlayState.position.y,
      overlaySize: overlayState.size
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interaction) return;

    if (interaction === 'pan') {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        onViewStateChange({ pan: { x: dragStart.current.panX + dx, y: dragStart.current.panY + dy } });
    } else if (interaction === 'drag' && imageSize) {
       const dx = (e.clientX - dragStart.current.x) / viewState.zoom;
       const dy = (e.clientY - dragStart.current.y) / viewState.zoom;
        onOverlayStateChange({
          position: {
            x: dragStart.current.overlayX + dx,
            y: dragStart.current.overlayY + dy,
          }
        });
    } else if (interaction === 'resize' && imageSize) {
        const dx = (e.clientX - dragStart.current.x) / viewState.zoom;
        const newSize = Math.max(10, dragStart.current.overlaySize + dx); // dx is a proxy for size change
        onOverlayStateChange({ size: newSize });
    }
  };

  const handleMouseUp = () => {
    setInteraction(null);
  };
  
  const handleMouseLeave = () => {
    setInteraction(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (interaction) return;
    e.preventDefault();
    const zoomFactor = 1 - e.deltaY * 0.001;
    const newZoom = viewState.zoom * zoomFactor;
    onViewStateChange({ zoom: Math.max(0.1, Math.min(newZoom, 5)) });
  };
  
  const imageWidth = useMemo(() => imageSize.width * (overlayState.size / 100), [imageSize.width, overlayState.size]);
  const imageHeight = useMemo(() => imageSize.height * (overlayState.size / 100), [imageSize.height, overlayState.size]);

  return (
    <Card className="flex-1 w-full h-full overflow-hidden">
      <CardContent
        ref={viewerRef}
        className={cn(
          "relative w-full h-full p-0 flex items-center justify-center overflow-hidden select-none bg-muted/10",
          interaction && (interaction === 'pan' ? 'cursor-grabbing' : 'cursor-grabbing'),
        )}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <div
            className="transition-transform duration-200"
            style={{
              transform: `translate(${viewState.pan.x}px, ${viewState.pan.y}px) scale(${viewState.zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {!pltFile && !overlayImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground z-0 p-8">
                <UploadCloud className="h-16 w-16" />
                <h2 className="text-xl font-medium">Start by uploading your files</h2>
                <p>Upload a PLT file and an image to begin overlaying.</p>
              </div>
            )}
            <div id="plt-svg-container" className="z-10">
              {pathData && viewBox && imageSize.width > 0 ? (
                 <svg
                    width={imageSize.width}
                    height={imageSize.height}
                    viewBox={viewBox}
                    preserveAspectRatio="xMidYMid meet"
                    className="drop-shadow-2xl"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ overflow: 'visible' }}
                 >
                    <defs>
                      <clipPath id={clipPathId}>
                        <path d={pathData} fillRule="evenodd" />
                      </clipPath>
                    </defs>
                    
                    {overlayImage && (
                        <g clipPath={`url(#${clipPathId})`}>
                          <image
                            href={overlayImage}
                            x={overlayState.position.x}
                            y={overlayState.position.y}
                            width={imageWidth}
                            height={imageHeight}
                            opacity={overlayState.opacity}
                            transform={`rotate(${overlayState.rotation} ${overlayState.position.x + imageWidth / 2} ${overlayState.position.y + imageHeight / 2})`}
                            className={interaction === 'drag' || interaction === 'resize' ? 'cursor-grabbing' : 'cursor-grab'}
                          />
                        </g>
                    )}
                    
                    <path 
                      d={pathData} 
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeOpacity="1"
                      vectorEffect="non-scaling-stroke"
                    />

                    {overlayImage && (
                        <g>
                           <rect 
                              id="overlay-drag-handle"
                              x={overlayState.position.x}
                              y={overlayState.position.y}
                              width={imageWidth}
                              height={imageHeight}
                              fill="transparent"
                              className="cursor-move"
                              transform={`rotate(${overlayState.rotation} ${overlayState.position.x + imageWidth / 2} ${overlayState.position.y + imageHeight / 2})`}
                           />
                           <rect 
                              id="overlay-resize-handle"
                              x={overlayState.position.x + imageWidth - 10}
                              y={overlayState.position.y + imageHeight - 10}
                              width="20"
                              height="20"
                              fill="hsl(var(--primary))"
                              stroke="white"
                              strokeWidth="2"
                              className="cursor-nwse-resize"
                               transform={`rotate(${overlayState.rotation} ${overlayState.position.x + imageWidth / 2} ${overlayState.position.y + imageHeight / 2})`}
                           />
                        </g>
                    )}
                 </svg>
              ) : (
                <PltPlaceholder />
              )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
