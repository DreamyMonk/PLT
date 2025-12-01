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

interface PltViewerProps {
  pltFile: File | null;
  overlayImage: string | null;
  overlayState: OverlayState;
  onStateChange: (newState: Partial<OverlayState>) => void;
}

export const PltViewer: FC<PltViewerProps> = ({
  pltFile,
  overlayImage,
  overlayState,
  onStateChange,
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
    // This is a simplified PLT to SVG conversion, focusing on PU, PD, and PA commands.
    const lines = pltContent.split(';').filter(cmd => cmd.trim());
    let pathData = '';
    let isPenDown = false;
    
    lines.forEach(line => {
      const command = line.substring(0, 2);
      const args = line.substring(2).split(',').map(s => s.trim()).filter(Boolean);

      if ((command === 'PU' || command === 'PD') && args.length >= 2) {
        const x = args[0];
        const y = args[1];
        if (command === 'PU') {
          isPenDown = false;
          pathData += ` M ${x} ${y}`;
        } else { // PD
          if (isPenDown) {
            pathData += ` L ${x} ${y}`;
          } else {
            pathData += ` M ${x} ${y}`;
          }
          isPenDown = true;
        }
      } else if (command === 'PA' && args.length >= 2) {
        const x = args[0];
        const y = args[1];
        if (isPenDown) {
          pathData += ` L ${x} ${y}`;
        } else {
          pathData += ` M ${x} ${y}`;
        }
      }
    });

    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid meet"
        className="stroke-current text-foreground"
        strokeWidth="1"
        fill="none"
      >
        <path d={pathData} />
      </svg>
    );
  }, [pltContent]);


  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!viewerRef.current) return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - overlayState.position.x,
      y: e.clientY - overlayState.position.y,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !viewerRef.current) return;
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    onStateChange({ position: { x: newX, y: newY } });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <Card className="flex-1 w-full h-full overflow-hidden">
      <CardContent
        ref={viewerRef}
        className="relative w-full h-full p-0 overflow-hidden select-none bg-muted/10"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
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
      </CardContent>
    </Card>
  );
};
