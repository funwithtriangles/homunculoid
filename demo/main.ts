import { clock, engine, engineStore } from "./engine";

import { Param } from "@hedron-gl/engine";
import { appCallbacks, appSetters, engineRef } from "./components/App";

export function initEngine() {
  // Populate engine reference for React components
  engineRef.engine = engine;
  engineRef.engineStore = engineStore;
  engineRef.clock = clock;
  appSetters.setEngineReady();

  // might help with iOS audio playback when silent mode is on
  if ("audioSession" in navigator) {
    navigator.audioSession.type = "playback";
  }

  let aspectRatio = window.innerWidth / window.innerHeight;

  window.addEventListener("resize", () => {
    aspectRatio = window.innerWidth / window.innerHeight;
  });
}
