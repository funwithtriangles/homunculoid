import {
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshLambertNodeMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  TextureLoader,
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
  uniform,
} from "three/tsl";
import { swarmUniformParams } from "./config";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { swarmDisplace } from "./swarmDisplace";

const gltfLoader = new GLTFLoader();

const textureLoader = new TextureLoader();

const COL_COUNT = 80;
const ROW_COUNT = 10;
const LAYER_COUNT = 5;
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
  yTravel = new Float32Array(INSTANCE_COUNT);
  yGroupTravel = uniform(0);
  yRotTravel = 0;
  swarmMat = new MeshLambertNodeMaterial();
  uniforms = convertParamsToUniforms(swarmUniformParams);
  ringAngleAttribute = new InstancedBufferAttribute(
    new Float32Array(INSTANCE_COUNT),
    1,
  );
  lastMatCapUrl?: string;

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
      // Bounds are cached from the first frame's instances and ignore shader displacement.
      this.instancedMesh.frustumCulled = false;

      this.root.add(this.instancedMesh);

      this.model.geometry.setAttribute("_ringAngle", this.ringAngleAttribute);
      const ringAngle = instancedBufferAttribute(this.ringAngleAttribute);

      const displace = swarmDisplace({
        uniforms: this.uniforms,
        ringAngle,
        yGroupTravel: this.yGroupTravel,
      });

      this.swarmMat.positionNode = positionLocal.add(displace);
      this.swarmMat.emissiveNode = this.uniforms.emissiveColor;
      this.swarmMat.colorNode = this.uniforms.color;
    });
  }

  updateInstances(
    ringRadius: number,
    yStartOffset: number,
    rowSpacing: number,
    ySpeed: number,
    yGroupSpeed: number,
    deltaFrame: number,
    colSpeedAmp: number,
    colSpeedWaveLength: number,
    layerSpacing: number,
    layerRadialOffset: number,
    layerYOffset: number,
  ) {
    if (!this.instancedMesh) return;

    const yLimit = rowSpacing * ROW_COUNT;
    const ringAngles = this.ringAngleAttribute.array as Float32Array;
    const yGroupStep = yGroupSpeed;
    this.yGroupTravel.value += yGroupStep;

    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      const layerRadius = ringRadius + layer * layerSpacing;
      const layerAngle = layer * layerRadialOffset;
      const layerY = layer * layerYOffset;

      for (let row = 0; row < ROW_COUNT; row++) {
        for (let i = 0; i < COL_COUNT; i++) {
          const index = (layer * ROW_COUNT + row) * COL_COUNT + i;
          const cN = i / COL_COUNT;
          const angle = cN * Math.PI * 2 + layerAngle;
          const yStart = cN * yStartOffset;
          const rowY = row * rowSpacing;
          const colSpeed =
            ((Math.sin(cN * Math.PI * 2 * colSpeedWaveLength) + 1) / 2) *
            colSpeedAmp;

          this.yTravel[index] =
            (this.yTravel[index] + ySpeed + colSpeed + yGroupStep) % yLimit;

          // Row offset sits inside the wrap so rows loop with the rest of the swarm.
          const y =
            ((yStart * yLimit + layerY + rowY + this.yTravel[index] + yLimit) %
              yLimit) -
            yLimit / 2;

          this.dummy.position.set(
            Math.cos(angle) * layerRadius,
            y,
            Math.sin(angle) * layerRadius,
          );
          this.dummy.rotation.y =
            -angle + this.yTravel[index] * 0.1 + this.yRotTravel;
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
    this.root.visible = p.isVisible;

    if (!p.isVisible) return;

    updateUniforms(swarmUniformParams, this.uniforms, p);

    // if (p.matcapFileName && p.matcapFileName !== this.lastMatCapUrl) {
    //   this.lastMatCapUrl = p.matcapFileName;
    //   textureLoader.load(p.matcapFileName, (matcap) => {
    //     this.swarmMat.matcap = matcap;
    //     this.swarmMat.needsUpdate = true;
    //   });
    // }

    this.yRotTravel = this.yRotTravel + p.yRotSpeed;
    this.root.rotation.y =
      (this.root.rotation.y + p.groupYRotSpeed) % (Math.PI * 2);
    this.updateInstances(
      p.ringRadius,
      p.yStartOffset,
      p.rowSpacing,
      p.ySpeed,
      p.yGroupSpeed,
      deltaFrame,
      p.colSpeedAmp,
      p.colSpeedWaveLength,
      p.layerSpacing,
      p.layerRadialOffset,
      p.layerYOffset,
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

    if (!this.trackedObject) {
      this.root.position.set(0, p.groupYPos, 0);
      return;
    }

    this.trackedObject.getWorldPosition(this.targetTrackedPosition);

    if (this.isFirstFrame) {
      this.trackedPosition.copy(this.targetTrackedPosition);
    } else {
      this.trackedPosition.lerp(
        this.targetTrackedPosition,
        1 - Math.exp(-1 * f),
      );
    }

    this.root.position.copy(this.trackedPosition);
    this.root.position.y += p.groupYPos;

    this.isFirstFrame = false;
  }

  dispose() {
    this.resetTrackedObject();
  }

  resetSwarm() {
    this.yGroupTravel.value = 0;
    this.yTravel.fill(0);
  }

  resetTrackedObject() {
    this.isFirstFrame = true;
    this.trackedObject = null;
  }
}
