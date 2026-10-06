import { StrictMode, useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import MainCard from "./MainCard";
import type { HedronEngine } from "@hedron-gl/engine";
import type { Clock } from "@hedron-gl/clock";
import { EngineProvider } from "@hedron-gl/ui-core";

// Callbacks that main.ts will set
export const appCallbacks = {
  onPlay: () => {},
  onPause: () => {},
};

// Setters that main.ts can call to update React state
export const appSetters = {
  setModelLoaded: (_: boolean) => {},
  setIsPlaying: (_: boolean) => {},
  setButtonText: (_: string) => {},
  setEngineReady: () => {},
};

// Engine reference - populated by main.ts when engine loads
export type EngineRef = {
  engine: HedronEngine | null;
  engineStore: ReturnType<HedronEngine["getStore"]> | null;
  clock: Clock | null;
};

export const engineRef: EngineRef = {
  engine: null,
  engineStore: null,
  clock: null,
};

function App() {
  const [modelLoaded, setModelLoaded] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [buttonText, setButtonText] = useState("Loading");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  const isLoaded = modelLoaded;

  // Expose setters to rest of app (e.g. sketches and main.ts)
  useEffect(() => {
    appSetters.setModelLoaded = setModelLoaded;
    appSetters.setIsPlaying = setIsPlaying;
    appSetters.setEngineReady = () => setEngineReady(true);
    appSetters.setButtonText = setButtonText;
  }, []);

  useEffect(() => {
    if (isLoaded) {
      appSetters.setButtonText("Play");
    }
  }, [isLoaded]);

  useEffect(() => {
    document.body.style.cursor = isPlaying ? "none" : "auto";
  }, [isPlaying]);

  const handleBodyClick = useCallback(() => {
    if (controlsOpen) {
      setControlsOpen(false);
    } else if (isPlaying) {
      appCallbacks.onPause();
    }
  }, [controlsOpen, isPlaying]);

  const handlePlayClick = useCallback(async () => {
    const requestFullscreen =
      document.body.requestFullscreen || document.body.webkitRequestFullscreen;
    if (requestFullscreen) {
      await requestFullscreen.call(document.body);
    }
    appCallbacks.onPlay();
  }, []);

  const handleToggleControls = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setControlsOpen((prev) => !prev);
  }, []);

  return (
    <EngineProvider value={engineRef.engine}>
      <div onClick={handleBodyClick} style={{ position: "fixed", inset: 0 }}>
        <MainCard
          codeLoaded={true}
          modelLoaded={modelLoaded}
          isLoaded={isLoaded}
          isPlaying={isPlaying}
          buttonText={buttonText}
          onPlayClick={handlePlayClick}
        />
        {/* {isPlaying && (
          <Controls isOpen={controlsOpen} onToggle={handleToggleControls} />
        )} */}
      </div>
    </EngineProvider>
  );
}

export function mountApp() {
  const container = document.getElementById("app")!;

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
