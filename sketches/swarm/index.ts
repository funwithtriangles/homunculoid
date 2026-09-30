import {
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardNodeMaterial,
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
  positionWorld,
  sin,
  cos,
  vec3,
  mx_atan2,
  instanceIndex,
  float,
} from "three/tsl";
import { swarmUniformParams } from "./config";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";

const gltfLoader = new GLTFLoader();

const COL_COUNT = 100;
const ROW_COUNT = 5;

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
  swarmMat = new MeshStandardNodeMaterial();
  uniforms = convertParamsToUniforms(swarmUniformParams);

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

      this.swarmMat.copy(
        this.model.material as unknown as MeshStandardNodeMaterial,
      );

      this.instancedMesh = new InstancedMesh(
        this.model.geometry,
        this.swarmMat,
        COL_COUNT * ROW_COUNT,
      );

      this.root.add(this.instancedMesh);

      const {
        wiggleWaveLength,
        wiggleAmp,
        radialWaveLength,
        radialAmp,
        radialOffsetAmp,
        radialOffsetWaveLength,
      } = this.uniforms;

      const radAngle = mx_atan2(positionLocal.z, positionLocal.x);
      const radialDir = vec3(positionLocal.x, 0, positionLocal.z).normalize();

      const radialDisplaceOffset = sin(
        radAngle.mul(radialOffsetWaveLength),
      ).mul(radialOffsetAmp);

      const radialDisplace = radialDir
        .mul(
          sin(positionWorld.y.mul(radialWaveLength).add(radialDisplaceOffset)),
        )
        .mul(radialAmp);

      // Ring angle matches updateInstances(); wiggle runs along the ring's tangent.
      const ringAngle = float(instanceIndex.mod(COL_COUNT))
        .div(COL_COUNT)
        .mul(Math.PI * 2);
      const ringTangent = vec3(sin(ringAngle).negate(), 0, cos(ringAngle));

      const wiggleDisplace = ringTangent.mul(
        sin(positionWorld.y.mul(wiggleWaveLength)).mul(wiggleAmp),
      );

      this.swarmMat.positionNode = positionLocal
        .add(radialDisplace)
        .add(wiggleDisplace);
    });
  }

  updateInstances(
    ringRadius: number,
    instanceRotY: number,
    yStartOffset: number,
    rowSpacing: number,
  ) {
    if (!this.instancedMesh) return;

    const yLimit = rowSpacing * ROW_COUNT;

    for (let row = 0; row < ROW_COUNT; row++) {
      for (let i = 0; i < COL_COUNT; i++) {
        const angle = (i / COL_COUNT) * Math.PI * 2;
        const yStart = (i / COL_COUNT) * yStartOffset;
        const rowY = row * rowSpacing;
        // Row offset sits inside the wrap so rows loop with the rest of the swarm.
        const y =
          ((((yStart * yLimit + rowY + this.yTravel) % yLimit) + yLimit) %
            yLimit) -
          yLimit / 2;
        this.dummy.position.set(
          Math.cos(angle) * ringRadius,
          y,
          Math.sin(angle) * ringRadius,
        );
        this.dummy.rotation.y = -angle + instanceRotY;
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(row * COL_COUNT + i, this.dummy.matrix);
      }
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  update({ params: p, deltaTime: f, deltaFrame }: UpdateParams) {
    updateUniforms(swarmUniformParams, this.uniforms, p);
    this.yTravel =
      (this.yTravel + p.ySpeed * deltaFrame) % (p.rowSpacing * ROW_COUNT);
    this.updateInstances(
      p.ringRadius,
      p.instanceRotY,
      p.yStartOffset,
      p.rowSpacing,
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
