import {
  Group,
  EquirectangularReflectionMapping,
  MeshStandardNodeMaterial,
  Mesh,
  MeshStandardMaterial,
  FogExp2,
  Color,
  PointLight,
  BasicShadowMap,
  DoubleSide,
  MeshBasicNodeMaterial,
  SkeletonHelper,
  Vector3,
} from "three/webgpu";
import { Scene, PerspectiveCamera, WebGPURenderer } from "three/webgpu";
import { GLTFLoader, RGBELoader, SkeletonUtils } from "three-stdlib";

import { appSetters } from "../../demo/components/App";

import ModuleGrid from "./ModuleGrid";
import Creature from "./Creature";
import hdrUrl from "./purple.hdr?url";
import glbUrl from "./homuncula.glb?url";
import {
  pmremTexture,
  luminance,
  mix,
  uniform,
  renderGroup,
  vec3,
} from "three/tsl";
import {
  homunculaUniformParams,
  PARTNER_COUNT,
  pipeSparkUniformParams,
} from "./config";
import { pipeSparkShape } from "./pipeSparkShape";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { armBandEnergyShape } from "./armBandEnergyShape";

const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();

const PARTNER_SPAWN_DROP = 20;
/** Rate a partner closes on its share of the circle, per second. */
const TURN_OFFSET_SMOOTHING = 1;

const isMesh = (object: any): object is Mesh => object.isMesh;

export default class Homuncula {
  root = new Group();
  model: Group | null = null;
  moduleGrid: ModuleGrid | null = null;
  creature: Creature | null = null;
  partners: Creature[] = [];
  pipeMat = new MeshStandardNodeMaterial();
  bgColor = new Color(0, 0, 1);
  // Render group so the value is uploaded once per render, not per render object.
  envRampLow = uniform(new Color(0x000000)).setGroup(renderGroup);
  envRampHigh = uniform(new Color(0xff0000)).setGroup(renderGroup);
  envIntensity = uniform(1).setGroup(renderGroup);
  pipeSparkColor = uniform(new Color(0xffffff));
  pipeSparkUniforms = convertParamsToUniforms(pipeSparkUniformParams);
  pipeSparkDelta = uniform(0).setGroup(renderGroup);
  pipeSparkPhase = 0;
  pipeSparkLargeNoiseDelta = uniform(0).setGroup(renderGroup);
  pipeSparkLargeNoisePhase = 0;
  energyColor = uniform(new Color(0xffffff));
  armBandUniforms = convertParamsToUniforms(homunculaUniformParams);
  armBandDeltas = {
    shapeRotation: uniform(0),
    bigNoise: uniform(0),
    smallNoise: uniform(0),
    displacement: uniform(0),
  };
  armBandPhase = {
    shapeRotation: 0,
    bigNoise: 0,
    smallNoise: 0,
    displacement: 0,
  };
  energyBandMat = new MeshBasicNodeMaterial();
  creatureWorldPos = uniform(new Vector3());
  pLight = new PointLight(0xffffff, 1);
  creatureAnchor = new Group();
  isCreatureVisible = false;
  partnersVisible = new Array(PARTNER_COUNT).fill(false) as boolean[];
  scene: Scene;
  camera: PerspectiveCamera;
  skeletonHelper: SkeletonHelper | null = null;

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
    scene.background = this.bgColor;
    scene.fog = new FogExp2(scene.background, 0.1);
    scene.fog.color = this.bgColor;

    this.camera = camera;

    this.root.add(this.pLight);
    this.creatureAnchor.visible = this.isCreatureVisible;

    const { energyShape, position } = armBandEnergyShape(
      this.armBandUniforms,
      this.armBandDeltas,
    );
    this.energyBandMat.side = DoubleSide;
    this.energyBandMat.transparent = true;
    this.energyBandMat.opacityNode = energyShape;
    this.energyBandMat.colorNode = vec3(energyShape).mul(this.energyColor);
    this.energyBandMat.positionNode = position;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = BasicShadowMap;

    this.pLight.castShadow = true;
    this.pLight.shadow.mapSize.width = 1024;
    this.pLight.shadow.mapSize.height = 1024;
    this.pLight.shadow.camera.near = 0.001;
    this.pLight.shadow.camera.far = 10;
    this.pLight.shadow.bias = -0.00001;

    const sparkShape = pipeSparkShape(
      this.creatureWorldPos,
      this.pipeSparkUniforms,
      this.pipeSparkDelta,
    );

    this.pipeMat.emissiveNode = sparkShape.mul(this.pipeSparkColor);

    gltfLoader.load(glbUrl, (gltf) => {
      this.model = gltf.scene;

      const modules = this.model.getObjectByName("modules");

      let hasCopiedPipeMat = false;

      if (modules) {
        modules.traverse((child) => {
          if (!isMesh(child)) return;

          child.castShadow = true;
          if (child.name.includes("pipes")) {
            if (!hasCopiedPipeMat) {
              this.pipeMat.copy(child.material as MeshStandardMaterial);
              hasCopiedPipeMat = true;
            }

            child.material = this.pipeMat;
            hasCopiedPipeMat = true;
          } else {
            child.receiveShadow = true;
          }
        });

        // Keep the source modules off the creature so they don't ride its path.
        this.root.add(modules);
      } else {
        console.warn("Could not find group named 'modules' in GLB.");
      }

      // Cloned before Creature writes Vector3/Quaternion into bone userData,
      // which Object3D.copy would flatten to plain objects.
      const partnerModels = Array.from({ length: PARTNER_COUNT }, () =>
        SkeletonUtils.clone(this.model!),
      );

      this.creature = new Creature(this.model, {
        debugSkeleton: false,
        energyBandMat: this.energyBandMat,
      });
      this.creatureAnchor.add(this.creature.root);

      this.creature.root.name = "creatureRoot";

      this.partners = partnerModels.map((partnerModel, index) => {
        const partner = new Creature(partnerModel, {
          energyBandMat: this.energyBandMat,
        });
        partner.root.name = `partner${index}`;
        partner.root.visible = this.partnersVisible[index];
        partner.turnOffset = (index + 1) / (PARTNER_COUNT + 1);
        this.creatureAnchor.add(partner.root);
        return partner;
      });

      this.root.add(this.creatureAnchor);

      if (modules) {
        this.moduleGrid = new ModuleGrid(modules as Group, {
          columns: 32,
          rows: 32,
        });
        this.root.add(this.moduleGrid.root);
      }

      this.skeletonHelper = this.creature.skeletonHelper;
      if (this.skeletonHelper) this.scene.add(this.skeletonHelper);

      appSetters.setModelLoaded(true);

      renderer.compile(scene, camera);
    });

    rgbeLoader.load(hdrUrl, (texture) => {
      texture.mapping = EquirectangularReflectionMapping;

      const env = pmremTexture(texture);

      scene.environmentNode = mix(
        this.envRampLow,
        this.envRampHigh,
        luminance(env.rgb).clamp(),
      ).mul(this.envIntensity);
    });
  }

  update({
    params,
    deltaTime,
  }: {
    params: any;
    deltaTime: number;
    deltaFrame: number;
    scene?: any;
  }) {
    if (this.moduleGrid) this.moduleGrid.isVisible = !params.hideFloor;

    this.bgColor.set(...params.bgColor);
    (this.scene.fog as FogExp2).density = params.fogDensity;

    this.envRampLow.value.set(...params.envRampLow);
    this.envRampHigh.value.set(...params.envRampHigh);
    this.envIntensity.value = params.envIntensity;

    this.pipeSparkColor.value.set(...params.pipeSparkColor);
    updateUniforms(pipeSparkUniformParams, this.pipeSparkUniforms, params);
    this.pipeSparkPhase += params.pipeSparkSpeed * deltaTime;
    this.pipeSparkDelta.value = this.pipeSparkPhase;
    this.pipeSparkLargeNoisePhase +=
      params.pipeSparkLargeNoiseSpeed * deltaTime;
    this.pipeSparkLargeNoiseDelta.value = this.pipeSparkLargeNoisePhase;

    updateUniforms(homunculaUniformParams, this.armBandUniforms, params);
    this.updateArmBandDeltas(params, deltaTime);
    this.energyColor.value.set(...params.pipeSparkColor);

    if (params.isCreatureVisible !== this.isCreatureVisible) {
      this.isCreatureVisible = params.isCreatureVisible;
      this.creatureAnchor.visible = this.isCreatureVisible;
      this.moduleGrid?.setCreature(
        this.isCreatureVisible ? this.creatureAnchor : null,
      );
    }

    if (this.isCreatureVisible) {
      this.creatureWorldPos.value.copy(this.creatureAnchor.position);
    } else {
      this.creatureWorldPos.value.set(0, 0, -999999);
    }

    this.updatePartners(params, deltaTime);

    this.pLight.distance = 0;
    this.pLight.power = params.pLightIntensity;
    this.pLight.color.set(...params.pLightColor);
    this.pLight.decay = 1;

    this.pLight.position.copy(this.camera.position);
    this.pLight.position.z = this.camera.position.z - 3;

    this.pLight.shadow.needsUpdate = true;

    this.creature?.update({ params, deltaTime });
    // Kept ticking while hidden so their path phase stays locked to the main one.
    this.partners.forEach((partner) => partner.update({ params, deltaTime }));
    this.moduleGrid?.update(this.camera.position);
  }

  /**
   * Visible creatures share the circle evenly, so a partner joining or leaving
   * eases the others from halves to thirds and back.
   */
  updatePartners(params: any, deltaTime: number) {
    const appeared = this.partners.map((partner, index) => {
      const visible = !!params[`partner${index}Visible`];
      if (visible === this.partnersVisible[index]) return false;

      this.partnersVisible[index] = visible;
      partner.root.visible = visible;
      if (visible) partner.spawnBelow(PARTNER_SPAWN_DROP);
      return visible;
    });

    const slots = this.partnersVisible.filter(Boolean).length + 1;
    const ease = 1 - Math.exp(-TURN_OFFSET_SMOOTHING * deltaTime);
    let slot = 0;

    this.partners.forEach((partner, index) => {
      if (!this.partnersVisible[index]) return;

      slot += 1;
      const target = slot / slots;
      partner.turnOffset +=
        (target - partner.turnOffset) * (appeared[index] ? 1 : ease);
    });
  }

  updateArmBandDeltas(params: any, deltaTime: number) {
    const advance = deltaTime * params.armBandMasterSpeed;

    this.armBandPhase.shapeRotation += params.armBandOrbitSpeed * advance;
    this.armBandPhase.bigNoise += params.armBandBigNoiseSpeed * advance;
    this.armBandPhase.smallNoise += params.armBandSmallNoiseSpeed * advance;
    this.armBandPhase.displacement += params.armBandDisplaceSpeed * advance;

    this.armBandDeltas.shapeRotation.value = this.armBandPhase.shapeRotation;
    this.armBandDeltas.bigNoise.value = this.armBandPhase.bigNoise;
    this.armBandDeltas.smallNoise.value = this.armBandPhase.smallNoise;
    this.armBandDeltas.displacement.value = this.armBandPhase.displacement;
  }

  creatureReset() {
    console.log("Resetting creature");
    this.pipeSparkPhase = 0;
    this.pipeSparkDelta.value = 0;
    this.pipeSparkLargeNoisePhase = 0;
    this.pipeSparkLargeNoiseDelta.value = 0;
    this.armBandPhase.shapeRotation = 0;
    this.armBandPhase.bigNoise = 0;
    this.armBandPhase.smallNoise = 0;
    this.armBandPhase.displacement = 0;
    this.armBandDeltas.shapeRotation.value = 0;
    this.armBandDeltas.bigNoise.value = 0;
    this.armBandDeltas.smallNoise.value = 0;
    this.armBandDeltas.displacement.value = 0;
    this.creature?.reset();
    this.partners.forEach((partner) => partner.reset());
  }

  dispose() {
    if (this.skeletonHelper) {
      this.scene.remove(this.skeletonHelper);
      this.skeletonHelper = null;
    }
    this.creature?.dispose();
    this.partners.forEach((partner) => partner.dispose());
    this.energyBandMat.dispose();
  }
}
