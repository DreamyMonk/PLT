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

  const handleIntelligentAdjust = async () => {
    if (!pltFile || !overlayImageFile) {
      toast({
        variant: 'destructive',
        title: 'Missing files',
        description: 'Please upload both a PLT file and an overlay image.',
      });
      return;
    }
    
    setIsSuggesting(true);
    try {
      const [pltFileContent, overlayImageDataUri] = await Promise.all([
        pltFile.text(),
        fileToDataUri(overlayImageFile),
      ]);

      const suggestion = await suggestOverlay({
        pltFileContent,
        overlayImageDataUri,
      });

      setOverlayState(prev => ({ ...prev, ...suggestion, position: { x: suggestion.position.x, y: suggestion.position.y} }));
      toast({
        title: 'Intelligent Adjustment Applied',
        description: 'The overlay has been adjusted based on AI suggestion.',
      });
    } catch (error) {
      console.error('Error during intelligent adjustment:', error);
      toast({
        variant: 'destructive',
        title: 'Suggestion Failed',
        description: 'Could not get an intelligent suggestion. Please try again.',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleShare = useCallback(() => {
    const params = new URLSearchParams();
    params.set("x", overlayState.position.x.toFixed(2));
    params.set("y", overlayState.position.y.toFixed(2));
    params.set("size", overlayState.size.toString());
    params.set("rotation", overlayState.rotation.toString());
    params.set("opacity", overlayState.opacity.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newUrl);

    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({
        title: "Link Copied!",
        description: "Shareable link has been copied to your clipboard.",
      });
    });
  }, [overlayState, toast]);

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
          onIntelligentAdjust={handleIntelligentAdjust}
          onShare={handleShare}
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
