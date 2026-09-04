import * as THREE from "three";

interface SketchConstructorArg {
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  scene: THREE.Scene;
}

interface UpdateParams {
  params: Record<string, any>;
  deltaFrame: number;
}

const TAU = Math.PI * 2;

// How far down the path the camera aims, which is what turns the tangent into a heading.
const LOOK_AHEAD = 10;

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
  orbitDelta = 0;
  latchDelta = 0;
  lerpDelta = 0;
  flyDelta = 0;
  head: THREE.Object3D | null = null;
  currentMode: "orbit" | "closeUp" = "orbit";
  currentType: "perspective" | "orthographic" = "perspective";
  isFirstFrame = true;
  perspectiveCamera = new THREE.PerspectiveCamera();
  orthographicCamera = new THREE.OrthographicCamera();
  sketchApi: SketchConstructorArg;

  constructor(sketchApi: SketchConstructorArg) {
    this.root = new THREE.Group();

    this.sketchApi = sketchApi;
    const { camera, scene } = sketchApi;

    this.sketchApi.camera = this.perspectiveCamera;

    this.sketchApi.camera = camera;

    this.lookAtPos = new THREE.Vector3();

    // this.sketchApi.camera.near = 0.0001;

    // Hack to position cameras on JBoys head
    setTimeout(() => {
      const item = scene.getObjectByName("mixamorigHead");
      if (item) {
        this.head = item;
      }
    }, 3000);
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

    if (this.currentMode != p.mode) {
      if (p.mode === "closeUp") {
        if (this.head) {
          this.head.add(this.sketchApi.camera);
          this.currentMode = "closeUp";
        }
      } else {
        this.sketchApi.scene.add(this.sketchApi.camera);
        this.currentMode = "orbit";
      }
    }

    if (this.currentMode === "orbit") {
      let rot;
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

      rot = this.orbitDelta;

      // Travel runs along -z, weaving on a sine wave, with the orbit rig riding on top.
      this.flyDelta -= p.flySpeed * f;

      const pathZ = this.flyDelta;
      const pathX = Math.sin(pathZ * p.waveFreq) * p.waveAmp;

      const aheadZ = pathZ - LOOK_AHEAD;
      const aheadX = Math.sin(aheadZ * p.waveFreq) * p.waveAmp;

      const x = Math.sin(rot) * p.orbitRad * p.bigOrbitRad;
      const z = Math.cos(rot) * p.orbitRad * p.bigOrbitRad;
      this.lookAtPos.set(aheadX, p.lookAtPosY, aheadZ);
      this.sketchApi.camera.position.set(pathX + x, p.camY, pathZ + z);
      this.sketchApi.camera.lookAt(this.lookAtPos);

      // Bank into the turn using the slope of the wave.
      const slope = Math.cos(pathZ * p.waveFreq) * p.waveAmp * p.waveFreq;
      this.sketchApi.camera.rotateZ(slope * p.tiltStrength);
    } else {
      this.sketchApi.camera.rotation.set(0, 0, 0);
      this.sketchApi.camera.position.set(0, 0, p.headCamDistance * 80);
    }

    this.isFirstFrame = false;

    this.sketchApi.camera.updateProjectionMatrix();
  }
}
