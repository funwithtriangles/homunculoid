import { EngineData, HedronEngine } from "@hedron-gl/engine";
import { Clock } from "@hedron-gl/clock";
import { LFOInput } from "@hedron-gl/lfo-input";
import projectData from "../homuncula.json";
import "@fontsource/chivo-mono";
import "@fontsource-variable/roboto-condensed";
import "./variables.css";
import "@hedron-gl/ui-core/modules.css";
import "./style.css";
import { getSketchModuleItems } from "./utils";
import { TimelineInput } from "@hedron-gl/timeline";

// Imported from the Hedron project save file (JSON)
const engineData = projectData.engine as unknown as EngineData;

// Because the project uses LFOs, we need a clock
export const clock = new Clock();
clock.bpm = 150;

// Initialize the engine with the clock
export const engine = new HedronEngine({
  rendererType: "webgpu",
  canvasSizeMode: "fillContainer",
  clock,
});

// Register the necessary plugins for this project
engine.registerPlugin(new LFOInput(engine));
engine.registerPlugin(new TimelineInput());

export const engineStore = engine.getStore();
const { setSketchModuleItem, loadProject } = engineStore.getState();

// Load in the sketch modules using a utility function (uses vite glob)
// This could also be done manually with simple `import` statements
const sketchModules = getSketchModuleItems();

// Set each sketch loaded module in the engine store
sketchModules.forEach(setSketchModuleItem);

// Start the engine
engine.startStoreListener();
engine.run();
loadProject(engineData);

engine.initiatePlugins();

// Add the canvas to the DOM
engine.createCanvas(document.getElementById("root") as HTMLElement);
