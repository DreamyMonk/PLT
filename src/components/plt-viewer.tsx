"use client";

import { useRef, useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
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
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [pltContent, setPltContent] = useState<string | null>(null);

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

  const pltSvg = useMemo(() => {
    if (!pltContent) return null;
    
    // Very basic PLT parser. Assumes HPGL.
    const commands = pltContent.split(';').filter(c => c.trim().length > 0);
    const pathData: string[] = [];
    let currentPos = { x: 0, y: 0 };
    let penDown = false;
    let scale = { x: 1, y: 1 };
    let offset = { x: 0, y: 0 };

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
      const args = (cmd.substring(2).match(/(-?\d+)/g) || []).map(Number);
      if (op === 'PU' || op === 'PD' || op === 'PA') {
         for (let i = 0; i < args.length; i += 2) {
            allCoords.push({x: args[i], y: args[i+1]});
         }
      }
    });

    const bounds = coordsToBounds(allCoords);
    const plotWidth = bounds.maxX - bounds.minX;
    const plotHeight = bounds.maxY - bounds.minY;

    if (plotWidth === 0 || plotHeight === 0) {
        return <PltPlaceholder />;
    }
    
    const viewBox = `${bounds.minX} ${bounds.minY} ${plotWidth} ${plotHeight}`;

    for (const cmd of commands) {
      const op = cmd.substring(0, 2).toUpperCase();
      const args = (cmd.substring(2).match(/(-?\d+)/g) || []).map(Number);

      switch (op) {
        case 'PU': // Pen Up
          penDown = false;
          if (args.length >= 2) {
            pathData.push(`M ${args[0]} ${args[1]}`);
            currentPos = { x: args[0], y: args[1] };
          }
          break;
        case 'PD': // Pen Down
          penDown = true;
           if (args.length >= 2) {
             for (let i = 0; i < args.length; i+=2) {
                pathData.push(`L ${args[i]} ${args[i+1]}`);
             }
            currentPos = { x: args[args.length-2], y: args[args.length-1] };
          }
          break;
        case 'PA': // Plot Absolute
            if (args.length >= 2) {
                for (let i = 0; i < args.length; i+=2) {
                    const op = penDown ? 'L' : 'M';
                    pathData.push(`${op} ${args[i]} ${args[i+1]}`);
                    penDown = true;
                }
                currentPos = { x: args[args.length-2], y: args[args.length-1] };
            }
          break;
        case 'IN': // Initialize
          pathData.length = 0;
          break;
      }
    }
    
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="stroke-current text-foreground"
        strokeWidth="1"
        fill="none"
      >
        <path d={pathData.join(' ')} />
      </svg>
    );
  }, [pltContent]);


  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!viewerRef.current) return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX / viewState.zoom - overlayState.position.x,
      y: e.clientY / viewState.zoom - overlayState.position.y,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !viewerRef.current) return;
    const newX = e.clientX / viewState.zoom - dragStartPos.current.x;
    const newY = e.clientY / viewState.zoom - dragStartPos.current.y;
    onOverlayStateChange({ position: { x: newX, y: newY } });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const newZoom = viewState.zoom * (1 - e.deltaY * 0.001);
    onViewStateChange({ zoom: Math.max(0.1, Math.min(newZoom, 5)) });
  };

  return (
    <Card className="flex-1 w-full h-full overflow-hidden">
      <CardContent
        ref={viewerRef}
        className="relative w-full h-full p-0 overflow-hidden select-none bg-muted/10"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <div
            className="absolute inset-0 transition-transform duration-200"
            style={{
              transform: `scale(${viewState.zoom})`,
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
            <div className="absolute inset-0 z-10 pointer-events-none">
              {pltSvg ? pltSvg : <PltPlaceholder />}
            </div>
            {overlayImage && (
              <img
                ref={imageRef}
                src={overlayImage}
                alt="Overlay"
                className={cn(
                  'absolute cursor-grab z-20',
                  isDragging && 'cursor-grabbing'
                )}
                style={{
                  left: `${overlayState.position.x}px`,
                  top: `${overlayState.position.y}px`,
                  width: `${overlayState.size}%`,
                  opacity: overlayState.opacity,
                  transform: `rotate(${overlayState.rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                onMouseDown={handleMouseDown}
                draggable="false"
              />
            )}
        </div>
      </CardContent>
    </Card>
  );
};
