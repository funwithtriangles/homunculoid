import {
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshPhongNodeMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGPURenderer,
} from "three/webgpu";
import { GLTFLoader } from "three-stdlib";
import glbUrl from "./lo.glb?url";
import {
  positionLocal,
  sin,
  cos,
  vec3,
  instancedBufferAttribute,
} from "three/tsl";
import { swarmUniformParams } from "./config";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { swarmDisplace } from "./swarmDisplace";

const gltfLoader = new GLTFLoader();

const COL_COUNT = 100;
const ROW_COUNT = 10;
const LAYER_COUNT = 3;
const INSTANCE_COUNT = COL_COUNT * ROW_COUNT * LAYER_COUNT;

interface UpdateParams {
  params: Record<string, any>;
  deltaTime: number;
  deltaFrame: number;
}

export default class Swarm {
  root = new Group();
  model: Mesh | null = null;
  instancedMesh: InstancedMesh | null = null;
  camera: PerspectiveCamera | null = null;
  scene: Scene;
  trackedObject: Object3D | null = null;
  trackedPosition = new Vector3();
  targetTrackedPosition = new Vector3();
  isFirstFrame = true;
  dummy = new Object3D();
  yTravel = 0;
  swarmMat = new MeshPhongNodeMaterial();
  uniforms = convertParamsToUniforms(swarmUniformParams);
  ringAngleAttribute = new InstancedBufferAttribute(
    new Float32Array(INSTANCE_COUNT),
    1,
  );

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

      this.instancedMesh = new InstancedMesh(
        this.model.geometry,
        this.swarmMat,
        INSTANCE_COUNT,
      );

      this.root.add(this.instancedMesh);

      this.model.geometry.setAttribute("_ringAngle", this.ringAngleAttribute);
      const ringAngle = instancedBufferAttribute(this.ringAngleAttribute);

      const displace = swarmDisplace({
        uniforms: this.uniforms,
        ringAngle,
      });

      this.swarmMat.positionNode = positionLocal.add(displace);
    });
  }

  updateInstances(
    ringRadius: number,
    instanceRotY: number,
    yStartOffset: number,
    rowSpacing: number,
    colSpeedMin: number,
    colSpeedAmp: number,
    colSpeedWaveLength: number,
    layerSpacing: number,
    layerRadialOffset: number,
  ) {
    if (!this.instancedMesh) return;

    const yLimit = rowSpacing * ROW_COUNT;
    const ringAngles = this.ringAngleAttribute.array as Float32Array;

    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      const layerRadius = ringRadius + layer * layerSpacing;
      const layerAngle = layer * layerRadialOffset;

      for (let row = 0; row < ROW_COUNT; row++) {
        for (let i = 0; i < COL_COUNT; i++) {
          const index = (layer * ROW_COUNT + row) * COL_COUNT + i;
          const cN = i / COL_COUNT;
          const angle = cN * Math.PI * 2 + layerAngle;
          const yStart = cN * yStartOffset;
          const rowY = row * rowSpacing;
          const colSpeed =
            colSpeedMin +
            ((Math.sin(cN * Math.PI * 2 * colSpeedWaveLength) + 1) / 2) *
              colSpeedAmp;
          // Row offset sits inside the wrap so rows loop with the rest of the swarm.
          const y =
            ((((yStart * yLimit + rowY + this.yTravel * colSpeed) % yLimit) +
              yLimit) %
              yLimit) -
            yLimit / 2;
          this.dummy.position.set(
            Math.cos(angle) * layerRadius,
            y,
            Math.sin(angle) * layerRadius,
          );
          this.dummy.rotation.y = -angle + instanceRotY;
          this.dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
          ringAngles[index] = angle;
        }
      }
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.ringAngleAttribute.needsUpdate = true;
  }

  update({ params: p, deltaTime: f, deltaFrame }: UpdateParams) {
    updateUniforms(swarmUniformParams, this.uniforms, p);
    this.yTravel = this.yTravel + p.ySpeed * deltaFrame;
    this.updateInstances(
      p.ringRadius,
      p.instanceRotY,
      p.yStartOffset,
      p.rowSpacing,
      p.colSpeedMin,
      p.colSpeedAmp,
      p.colSpeedWaveLength,
      p.layerSpacing,
      p.layerRadialOffset,
    );
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
