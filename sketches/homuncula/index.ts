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
  SkeletonHelper,
} from "three/webgpu";
import { Scene, PerspectiveCamera, WebGPURenderer } from "three/webgpu";
import { GLTFLoader, RGBELoader } from "three-stdlib";

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
  color,
  sin,
  positionWorld,
  time,
  vec3,
  attribute,
  mx_noise_float,
  vec2,
} from "three/tsl";

const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();

const isMesh = (object: any): object is Mesh => object.isMesh;

export default class Homuncula {
  root = new Group();
  model: Group | null = null;
  moduleGrid: ModuleGrid | null = null;
  creature: Creature | null = null;
  pipeMat = new MeshStandardNodeMaterial();
  bgColor = new Color(0, 0, 1);
  // Render group so the value is uploaded once per render, not per render object.
  envRampLow = uniform(new Color(0x000000)).setGroup(renderGroup);
  envRampHigh = uniform(new Color(0xff0000)).setGroup(renderGroup);
  envIntensity = uniform(1).setGroup(renderGroup);
  pipeSparkColor = uniform(new Color(0xffffff));
  pLight = new PointLight(0xffffff, 1);
  creatureAnchor = new Group();
  isCreatureVisible = false;
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

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = BasicShadowMap;

    this.pLight.castShadow = true;
    this.pLight.shadow.mapSize.width = 1024;
    this.pLight.shadow.mapSize.height = 1024;
    this.pLight.shadow.camera.near = 0.001;
    this.pLight.shadow.camera.far = 10;
    this.pLight.shadow.bias = -0.00001;

    const pipeIndex = attribute("_pipeindex", "float" as const);
    const pipeOffset = pipeIndex.mul(100);

    const sparkDelta = time.mul(5);

    const sparkMask = mx_noise_float(
      positionWorld.xz.mul(vec2(0.5, 0.3)),
    ).smoothstep(0, 0.2);

    const pulse = sin(positionWorld.z.add(sparkDelta.add(pipeOffset)).mul(0.2))
      .add(1)
      .div(2);

    const sparkColor = vec3(pulse)
      .smoothstep(0.99, 1)
      .mul(this.pipeSparkColor)
      .mul(sparkMask);

    this.pipeMat.emissiveNode = sparkColor;

    // this.pipeMat.emissiveNode = vec3(sin(pipeIndex.mul(0.5)).add(1).div(2));

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

      this.creature = new Creature(this.model, { debugSkeleton: false });
      this.creatureAnchor.add(this.creature.root);
      this.root.add(this.creatureAnchor);

      if (modules) {
        this.moduleGrid = new ModuleGrid(modules as Group, {
          columns: 16,
          rows: 16,
        });
        this.root.add(this.moduleGrid.root);
      }

      this.skeletonHelper = this.creature.skeletonHelper;
      if (this.skeletonHelper) this.scene.add(this.skeletonHelper);

      appSetters.setModelLoaded(true);
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

    if (params.isCreatureVisible !== this.isCreatureVisible) {
      this.isCreatureVisible = params.isCreatureVisible;
      this.creatureAnchor.visible = this.isCreatureVisible;
      this.moduleGrid?.setCreature(
        this.isCreatureVisible ? this.creatureAnchor : null,
      );
    }

    this.pLight.distance = 0;
    this.pLight.power = params.pLightIntensity;
    this.pLight.color.set(...params.pLightColor);
    this.pLight.decay = 2;

    this.pLight.position.copy(this.camera.position);
    this.pLight.position.z = this.camera.position.z - 3;

    this.pLight.shadow.needsUpdate = true;

    this.creature?.update({ params, deltaTime });
    this.moduleGrid?.update(this.camera.position);
  }

  creatureReset() {
    console.log("Resetting creature");
    this.creature?.reset();
  }

  dispose() {
    if (this.skeletonHelper) {
      this.scene.remove(this.skeletonHelper);
      this.skeletonHelper = null;
    }
    this.creature?.dispose();
  }
}
