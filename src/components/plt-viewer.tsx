"use client";

import { useRef, useState } from 'react';
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
        className="relative w-full h-full p-0 overflow-hidden select-none"
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
          <PltPlaceholder />
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
