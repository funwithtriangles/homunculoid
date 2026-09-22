import * as THREE from "three";

interface SketchConstructorArg {
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  scene: THREE.Scene;
}

interface UpdateParams {
  params: Record<string, any>;
  deltaTime: number;
  deltaFrame: number;
}

const TAU = Math.PI * 2;

const { lerp } = THREE.MathUtils;

const easeOutCubic = (x: number): number => {
  return 1 - Math.pow(1 - x, 3);
};

const easeOutSine = (x: number): number => {
  return Math.sin((x * Math.PI) / 2);
};

export default class Camera {
  root: THREE.Group;
  lookAtPos: THREE.Vector3;
  targetLookAtPos = new THREE.Vector3();
  orbitDelta = 0;
  latchDelta = 0;
  lerpDelta = 0;
  flyDelta = 0;
  zRot = 0;
  targetZRot = 0;
  trackedObject: THREE.Object3D | null = null;
  currentMode: "fly" | "tracksObject" = "fly";
  currentType: "perspective" | "orthographic" = "perspective";
  isFirstFrame = true;
  perspectiveCamera = new THREE.PerspectiveCamera();
  orthographicCamera = new THREE.OrthographicCamera();
  sketchApi: SketchConstructorArg;
  trackedPosition = new THREE.Vector3();
  targetTrackedPosition = new THREE.Vector3();
  trackedCameraPosition = new THREE.Vector3();

  constructor(sketchApi: SketchConstructorArg) {
    this.root = new THREE.Group();

    this.sketchApi = sketchApi;
    const { camera } = sketchApi;

    this.sketchApi.camera = this.perspectiveCamera;

    this.sketchApi.camera = camera;

    this.lookAtPos = new THREE.Vector3();

    // this.sketchApi.camera.near = 0.0001;
  }

  update({ params: p, deltaTime: f }: UpdateParams) {
    if (this.currentType !== p.cameraType) {
      if (p.cameraType === "perspective") {
        this.sketchApi.camera = this.perspectiveCamera;
      } else {
        this.sketchApi.camera = this.orthographicCamera;
      }
      this.currentType = p.cameraType;
    }

    if (this.sketchApi.camera instanceof THREE.PerspectiveCamera) {
      this.sketchApi.camera.fov = p.fov;
      this.sketchApi.camera.filmOffset = p.filmOffset;
      this.sketchApi.camera.zoom = p.perspectiveZoom;
    } else {
      this.sketchApi.camera.zoom = p.orthographicZoom;
    }

    if (this.isFirstFrame) {
      this.orbitDelta = p.orbitRot;
      this.latchDelta = this.orbitDelta;
      this.lerpDelta = 1;
    }

    if (this.currentMode !== p.mode) {
      this.currentMode = p.mode;
    }

    if (
      this.currentMode === "tracksObject" &&
      p.trackedObjectName &&
      !this.trackedObject
    ) {
      this.trackedObject = p.trackedObjectName
        ? (this.sketchApi.scene.getObjectByName(p.trackedObjectName) ?? null)
        : null;
    }

    if (p.isRotating && !this.isFirstFrame) {
      this.orbitDelta = (this.orbitDelta + f * p.rotSpeed) % TAU;
      this.lerpDelta = 0;
      this.latchDelta = this.orbitDelta;
    } else {
      let diff = p.orbitRot - this.orbitDelta;
      if (diff < 0) {
        diff += TAU;
      }

      const step = (p.rotSpeed * f) / TAU;
      const target = this.orbitDelta + diff;

      if (this.lerpDelta < 1) {
        this.lerpDelta += step;
        this.orbitDelta = lerp(
          this.latchDelta,
          target,
          easeOutCubic(this.lerpDelta),
        );
      } else {
        this.orbitDelta = target % TAU;
      }
    }

    if (this.currentMode === "fly") {
      // Travel runs along -z, weaving on a sine wave, with the orbit rig riding on top.
      this.flyDelta -= p.flySpeed * f;

      const pathZ = this.flyDelta;
      const pathX = Math.sin(pathZ * p.waveFreq) * p.waveAmp;

      const aheadZ = pathZ - p.lookAhead;
      const aheadX = Math.sin(aheadZ * p.waveFreq) * p.waveAmp;

      this.targetTrackedPosition.set(pathX, 0, pathZ);
      this.targetLookAtPos.set(aheadX, p.lookAtPosY, aheadZ);

      // Bank into the turn using the slope of the wave.
      const slope = Math.cos(pathZ * p.waveFreq) * p.waveAmp;
      this.targetZRot = slope * p.tiltStrength;
    } else if (this.trackedObject) {
      this.targetZRot = 0;
      this.trackedObject.getWorldPosition(this.targetTrackedPosition);

      this.targetLookAtPos
        .copy(this.targetTrackedPosition)
        .add(new THREE.Vector3(0, p.lookAtPosY, 0));
    }

    if (this.isFirstFrame) {
      this.trackedPosition.copy(this.targetTrackedPosition);
    } else {
      this.trackedPosition.lerp(
        this.targetTrackedPosition,
        1 - Math.exp(-1 * f),
      );
    }

    const circX = Math.sin(this.orbitDelta) * p.orbitRad * p.bigOrbitRad;
    const circZ = Math.cos(this.orbitDelta) * p.orbitRad * p.bigOrbitRad;
    this.trackedCameraPosition.set(
      this.trackedPosition.x + circX,
      this.trackedPosition.y + p.camY,
      this.trackedPosition.z + circZ,
    );
    this.sketchApi.camera.position.copy(this.trackedCameraPosition);

    if (this.isFirstFrame) {
      this.lookAtPos.copy(this.targetLookAtPos);
    } else {
      this.lookAtPos.lerp(this.targetLookAtPos, 1 - Math.exp(-1 * f));
    }

    this.sketchApi.camera.lookAt(this.lookAtPos);

    if (this.isFirstFrame) {
      this.zRot = this.targetZRot;
    } else {
      this.zRot = lerp(this.zRot, this.targetZRot, 1 - Math.exp(-1 * f));
    }

    this.sketchApi.camera.rotateZ(this.zRot);

    this.isFirstFrame = false;

    this.sketchApi.camera.updateProjectionMatrix();
  }

  dispose() {
    this.trackedObject = null;
  }
}
