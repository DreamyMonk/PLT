"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { ControlPanel } from "@/components/control-panel";
import { PltViewer } from "@/components/plt-viewer";
import { useToast } from "@/hooks/use-toast";
import { suggestOverlay } from "@/ai/flows/suggest-overlay-flow";

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

const INITIAL_OVERLAY_STATE: OverlayState = {
  position: { x: 0, y: 0 },
  size: 100,
  rotation: 0,
  opacity: 1,
};

const INITIAL_VIEW_STATE: ViewState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
};

function PLTOverlayPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [pltFile, setPltFile] = useState<File | null>(null);
  const [overlayImageFile, setOverlayImageFile] = useState<File | null>(null);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [overlayState, setOverlayState] = useState<OverlayState>(INITIAL_OVERLAY_STATE);
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const x = params.get("x");
    const y = params.get("y");
    const size = params.get("size");
    const rotation = params.get("rotation");
    const opacity = params.get("opacity");

    if (x || y || size || rotation || opacity) {
      setOverlayState({
        position: {
          x: x ? parseFloat(x) : INITIAL_OVERLAY_STATE.position.x,
          y: y ? parseFloat(y) : INITIAL_OVERLAY_STATE.position.y,
        },
        size: size ? parseFloat(size) : INITIAL_OVERLAY_STATE.size,
        rotation: rotation ? parseFloat(rotation) : INITIAL_OVERLAY_STATE.rotation,
        opacity: opacity ? parseFloat(opacity) : INITIAL_OVERLAY_STATE.opacity,
      });
      toast({
        title: "Settings Loaded",
        description: "Overlay settings have been loaded from the URL.",
      });
    }
  }, [searchParams, toast]);

  const handlePltUpload = (file: File) => {
    setPltFile(file);
  };

  const handleImageUpload = (file: File) => {
    setOverlayImageFile(file);
    setOverlayImage(URL.createObjectURL(file));
  };
  
  const updateOverlayState = (newState: Partial<OverlayState>) => {
    setOverlayState(prev => ({ ...prev, ...newState }));
  };

  const updateViewState = (newState: Partial<ViewState>) => {
    setViewState(prev => ({ ...prev, ...newState }));
  };

  const handleReset = () => {
    setOverlayState(INITIAL_OVERLAY_STATE);
    setViewState(INITIAL_VIEW_STATE);
    toast({
      title: "Settings Reset",
      description: "Overlay and view adjustments have been reset to their default values.",
    });
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDownload = useCallback(() => {
    const svgElement = document.getElementById('plt-svg-container')?.querySelector('svg');
    if (!svgElement) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find the SVG to download.',
      });
      return;
    }

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);

    // Add XML declaration and doctype
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "design.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    toast({
      title: "Download Started",
      description: "Your SVG file is being downloaded.",
    });
  }, [toast]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_380px] gap-4 p-4 overflow-hidden">
        <PltViewer
          pltFile={pltFile}
          overlayImage={overlayImage}
          overlayState={overlayState}
          viewState={viewState}
          onOverlayStateChange={updateOverlayState}
          onViewStateChange={updateViewState}
        />
        <ControlPanel
          pltFile={pltFile}
          overlayImage={overlayImage}
          overlayState={overlayState}
          viewState={viewState}
          isSuggesting={isSuggesting}
          onOverlayStateChange={updateOverlayState}
          onViewStateChange={updateViewState}
          onPltUpload={handlePltUpload}
          onImageUpload={handleImageUpload}
          onReset={handleReset}
          onDownload={handleDownload}
        />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PLTOverlayPage />
    </Suspense>
  );
}
