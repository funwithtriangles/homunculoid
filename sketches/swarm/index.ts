import {
  Group,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGPURenderer,
} from "three/webgpu";
import { GLTFLoader } from "three-stdlib";
import glbUrl from "./lo.glb?url";

const gltfLoader = new GLTFLoader();

interface UpdateParams {
  params: Record<string, any>;
  deltaTime: number;
  deltaFrame: number;
}

export default class Swarm {
  root = new Group();
  model: Mesh | null = null;
  camera: PerspectiveCamera | null = null;
  scene: Scene;
  trackedObject: Object3D | null = null;
  trackedPosition = new Vector3();
  targetTrackedPosition = new Vector3();
  isFirstFrame = true;

  constructor({
    scene,
    camera,
    renderer,
  }: {
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGPURenderer;
  }) {
    this.scene = scene;

    gltfLoader.load(glbUrl, (gltf) => {
      const scene = gltf.scene;
      this.model = scene.getObjectByName("low") as Mesh;
      this.root.add(this.model);
    });
  }

  update({ params: p, deltaTime: f }: UpdateParams) {
    // Check if the tracked object has changed and update the reference accordingly.
    if (this.trackedObject && p.trackedObjectName) {
      const newObject = this.scene.getObjectByName(p.trackedObjectName) ?? null;
      if (newObject !== this.trackedObject) {
        this.trackedObject = newObject;
        this.resetTrackedObject();
      }
    }

    if (p.trackedObjectName && !this.trackedObject) {
      this.trackedObject =
        this.scene.getObjectByName(p.trackedObjectName) ?? null;
    }

    if (!this.trackedObject) return;

    this.trackedObject.getWorldPosition(this.targetTrackedPosition);

    if (this.isFirstFrame) {
      this.trackedPosition.copy(this.targetTrackedPosition);
    } else {
      this.trackedPosition.lerp(
        this.targetTrackedPosition,
        (1 - Math.exp(-1 * f)) * 10,
      );
    }

    this.root.position.copy(this.trackedPosition);

    this.isFirstFrame = false;
  }

  dispose() {
    this.resetTrackedObject();
  }

  resetTrackedObject() {
    this.isFirstFrame = true;
    this.trackedObject = null;
  }
}
