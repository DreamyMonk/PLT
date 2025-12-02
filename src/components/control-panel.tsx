"use client";

import type { FC } from 'react';
import { UploadCloud, Image as ImageIcon, SlidersHorizontal, Download, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Input } from './ui/input';

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

interface ControlPanelProps {
  pltFile: File | null;
  overlayImage: string | null;
  overlayState: OverlayState;
  viewState: ViewState;
  isSuggesting: boolean;
  onOverlayStateChange: (newState: Partial<OverlayState>) => void;
  onViewStateChange: (newState: Partial<ViewState>) => void;
  onPltUpload: (file: File) => void;
  onImageUpload: (file: File) => void;
  onReset: () => void;
  onDownload: () => void;
}

const FileInput: FC<{ id: string; onFileSelect: (file: File) => void; accept: string }> = ({ id, onFileSelect, accept }) => (
  <Input
    id={id}
    type="file"
    className="hidden"
    accept={accept}
    onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
  />
);

export const ControlPanel: FC<ControlPanelProps> = ({
  pltFile,
  overlayImage,
  overlayState,
  viewState,
  isSuggesting,
  onOverlayStateChange,
  onViewStateChange,
  onPltUpload,
  onImageUpload,
  onReset,
  onDownload,
}) => {

  const handlePositionChange = (axis: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onOverlayStateChange({ position: { ...overlayState.position, [axis]: numValue } });
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const zoomFactor = direction === 'in' ? 1.1 : 0.9;
    onViewStateChange({ zoom: viewState.zoom * zoomFactor });
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UploadCloud className="h-5 w-5" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Label htmlFor="plt-upload" className="w-full">
            <Button asChild variant="outline" className="w-full">
              <span className="truncate">
                <FileText className="mr-2" />
                {pltFile ? pltFile.name : 'Upload PLT'}
              </span>
            </Button>
          </Label>
          <FileInput id="plt-upload" onFileSelect={onPltUpload} accept=".plt" />

          <Label htmlFor="image-upload" className="w-full">
            <Button asChild variant="outline" className="w-full">
              <span className="truncate">
                <ImageIcon className="mr-2" />
                {overlayImage ? 'Change Image' : 'Upload Image'}
              </span>
            </Button>
          </Label>
          <FileInput id="image-upload" onFileSelect={onImageUpload} accept="image/*" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
              <ZoomIn className="h-5 w-5" />
              View Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
              <Label htmlFor="zoom-slider">Zoom ({Math.round(viewState.zoom * 100)}%)</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleZoom('out')}><ZoomOut /></Button>
                <Slider
                  id="zoom-slider"
                  min={0.1}
                  max={5}
                  step={0.01}
                  value={[viewState.zoom]}
                  onValueChange={([val]) => onViewStateChange({ zoom: val })}
                />
                <Button variant="outline" size="icon" onClick={() => handleZoom('in')}><ZoomIn /></Button>
              </div>
          </div>
        </CardContent>
      </Card>

      <Card className={!overlayImage ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5" />
            Overlay Adjustments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Position (X, Y)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={Math.round(overlayState.position.x)}
                onChange={(e) => handlePositionChange('x', e.target.value)}
                aria-label="Position X"
              />
              <Input
                type="number"
                value={Math.round(overlayState.position.y)}
                onChange={(e) => handlePositionChange('y', e.target.value)}
                aria-label="Position Y"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="size-slider">Size ({overlayState.size}%)</Label>
            <Slider
              id="size-slider"
              min={10}
              max={200}
              step={1}
              value={[overlayState.size]}
              onValueChange={([val]) => onOverlayStateChange({ size: val })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rotation-slider">Rotation ({overlayState.rotation}°)</Label>
            <Slider
              id="rotation-slider"
              min={-180}
              max={180}
              step={1}
              value={[overlayState.rotation]}
              onValueChange={([val]) => onOverlayStateChange({ rotation: val })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="opacity-slider">Opacity ({Math.round(overlayState.opacity * 100)}%)</Label>
            <Slider
              id="opacity-slider"
              min={0}
              max={1}
              step={0.01}
              value={[overlayState.opacity]}
              onValueChange={([val]) => onOverlayStateChange({ opacity: val })}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
            <Button onClick={onDownload} className="w-full">
              <Download />
              Download SVG
            </Button>
        </CardContent>
      </Card>
    </div>
  );
};
