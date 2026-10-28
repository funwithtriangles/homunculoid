import * as THREE from "three";
import { positioningParams } from "./config";

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
  lookAtPosA = new THREE.Vector3();
  lookAtPosB = new THREE.Vector3();
  yPos = 0;
  orbitRad = 0;
  targetLookAtPosA = new THREE.Vector3();
  targetLookAtPosB = new THREE.Vector3();
  orbitDelta = 0;
  latchDelta = 0;
  lerpDelta = 0;
  flyDelta = 0;
  zRot = 0;
  targetZRot = 0;
  trackedObject: THREE.Object3D | null = null;
  currentMode: "fly" | "tracksObject" = "fly";
  currentType: "perspective" | "orthographic" = "perspective";
  currentCameraSelect = "cameraA";
  isFirstFrame = true;
  perspectiveCamera = new THREE.PerspectiveCamera();
  orthographicCamera = new THREE.OrthographicCamera();
  sketchApi: SketchConstructorArg;
  trackedPositionA = new THREE.Vector3();
  trackedPositionB = new THREE.Vector3();
  targetTrackedPosition = new THREE.Vector3();
  trackedCameraPosition = new THREE.Vector3();

  get trackedPosition() {
    return this.currentCameraSelect === "cameraB"
      ? this.trackedPositionB
      : this.trackedPositionA;
  }

  get lookAtPos() {
    return this.currentCameraSelect === "cameraB"
      ? this.lookAtPosB
      : this.lookAtPosA;
  }

  get targetLookAtPos() {
    return this.currentCameraSelect === "cameraB"
      ? this.targetLookAtPosB
      : this.targetLookAtPosA;
  }

  constructor(sketchApi: SketchConstructorArg) {
    this.root = new THREE.Group();

    this.sketchApi = sketchApi;
    const { camera } = sketchApi;

    this.sketchApi.camera = this.perspectiveCamera;

    this.sketchApi.camera = camera;

    // this.sketchApi.camera.near = 0.0001;
  }

  update({ params, deltaTime: f }: UpdateParams) {
    const cameraSelect = params.cameraSelect ?? "cameraA";
    const cameraBParams = {
      ...params,
      ...Object.fromEntries(
        positioningParams.map(({ key, defaultValue }) => [
          key,
          params[`${key}_cameraB`] ?? defaultValue,
        ]),
      ),
    };
    const p = cameraSelect === "cameraB" ? cameraBParams : params;
    const lerpVal = (1 - Math.exp(-1 * f)) * p.lerpSpeed;

    // Check if the tracked object has changed and update the reference accordingly.
    if (this.trackedObject && p.trackedObjectName) {
      const newObject =
        this.sketchApi.scene.getObjectByName(p.trackedObjectName) ?? null;
      if (newObject !== this.trackedObject) {
        this.trackedObject = newObject;
        this.resetTrackedObject();
      }
    }

    const snap = this.isFirstFrame || cameraSelect !== this.currentCameraSelect;
    this.currentCameraSelect = cameraSelect;

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

    if (snap) {
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

    if (p.isRotating && !snap) {
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

      this.targetTrackedPosition.set(pathX, 0, pathZ);

      // Bank into the turn using the slope of the wave.
      const slope = Math.cos(pathZ * p.waveFreq) * p.waveAmp;
      this.targetZRot = slope * p.tiltStrength;
    } else if (this.trackedObject) {
      this.targetZRot = 0;
      this.trackedObject.getWorldPosition(this.targetTrackedPosition);
    }

    for (const [position, lookAt, targetLookAt, trackingParams] of [
      [this.trackedPositionA, this.lookAtPosA, this.targetLookAtPosA, params],
      [this.trackedPositionB, this.lookAtPosB, this.targetLookAtPosB, cameraBParams],
    ] as const) {
      const target =
        this.currentMode === "fly"
          ? new THREE.Vector3(
              Math.sin(this.flyDelta * trackingParams.waveFreq) *
                trackingParams.waveAmp,
              0,
              this.flyDelta,
            )
          : this.targetTrackedPosition;

      if (this.currentMode === "fly") {
        const aheadZ = this.flyDelta - trackingParams.lookAhead;
        targetLookAt.set(
          Math.sin(aheadZ * trackingParams.waveFreq) * trackingParams.waveAmp,
          trackingParams.lookAtPosY,
          aheadZ,
        );
      } else if (this.trackedObject) {
        targetLookAt.copy(this.targetTrackedPosition);
        targetLookAt.y += trackingParams.lookAtPosY;
      }

      if (this.isFirstFrame) {
        position.copy(target);
        lookAt.copy(targetLookAt);
      } else {
        const trackingLerpVal =
          (1 - Math.exp(-1 * f)) * trackingParams.lerpSpeed;
        position.lerp(target, trackingLerpVal);
        lookAt.lerp(targetLookAt, trackingLerpVal);
      }
    }

    if (snap) {
      this.orbitRad = p.orbitRad;
      this.yPos = p.camY;
    } else {
      this.orbitRad = lerp(this.orbitRad, p.orbitRad, lerpVal);
    }

    const circX = Math.sin(this.orbitDelta) * this.orbitRad * p.bigOrbitRad;
    const circZ = Math.cos(this.orbitDelta) * this.orbitRad * p.bigOrbitRad;
    this.trackedCameraPosition.set(
      this.trackedPosition.x + circX,
      this.trackedPosition.y + this.yPos,
      this.trackedPosition.z + circZ,
    );
    this.sketchApi.camera.position.copy(this.trackedCameraPosition);

    if (!snap) {
      this.yPos = lerp(this.yPos, p.camY, lerpVal);
    }

    this.sketchApi.camera.lookAt(this.lookAtPos);

    if (snap) {
      this.zRot = this.targetZRot;
    } else {
      this.zRot = lerp(this.zRot, this.targetZRot, lerpVal);
    }

    this.sketchApi.camera.rotateZ(this.zRot);

    this.isFirstFrame = false;

    this.sketchApi.camera.updateProjectionMatrix();
  }

  dispose() {
    this.resetTrackedObject();
  }

  resetRot() {
    this.orbitDelta = 0;
    this.isFirstFrame = true;
  }

  resetTrackedObject() {
    this.isFirstFrame = true;
    this.trackedObject = null;
  }
}
