// Lightweight entry point - loads React immediately, then dynamically imports Three.js
import { mountApp } from "./components/App";

// Mount React app immediately (small bundle)
mountApp();

// Dynamically import the heavy Three.js code
import("./main").then(({ initEngine }) => {
  initEngine();
});
