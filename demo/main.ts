import { clock, engine, engineStore } from "./engine";

import { appCallbacks, appSetters, engineRef } from "./components/App";

const IS_PLAYING_ID = "fab78da42bee88fa";
const PLAYHEAD_POS_ID = "5fab78da42bee88f";

export function initEngine() {
  // Populate engine reference for React components
  engineRef.engine = engine;
  engineRef.engineStore = engineStore;
  engineRef.clock = clock;
  appSetters.setEngineReady();

  appCallbacks.onPlay = () => {
    engine.setParamValue(IS_PLAYING_ID, true);
  };

  appCallbacks.onPause = () => {
    engine.setParamValue(IS_PLAYING_ID, false);
  };

  engine.subscribeToParamValue<boolean>(IS_PLAYING_ID, (value) => {
    appSetters.setIsPlaying(value);
  });

  // might help with iOS audio playback when silent mode is on
  if ("audioSession" in navigator) {
    navigator.audioSession.type = "playback";
  }

  let aspectRatio = window.innerWidth / window.innerHeight;

  window.addEventListener("resize", () => {
    aspectRatio = window.innerWidth / window.innerHeight;
  });
}
