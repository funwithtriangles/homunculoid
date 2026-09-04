import {
  Group,
  EquirectangularReflectionMapping,
  MeshStandardNodeMaterial,
  Mesh,
  MeshStandardMaterial,
  FogExp2,
  Color,
  PointLight,
  SpotLight,
  BasicShadowMap,
} from "three/webgpu";
import type { Scene, PerspectiveCamera } from "three/webgpu";
import { GLTFLoader, RGBELoader, DRACOLoader } from "three-stdlib";

import ModuleGrid from "./ModuleGrid";
import hdrUrl from "./purple.hdr?url";
import glbUrl from "./homuncula.glb?url";
import {
  attribute,
  distance,
  mul,
  mx_worley_noise_float,
  positionLocal,
  positionWorld,
  select,
  time,
  vec2,
  vec3,
  pmremTexture,
  luminance,
  mix,
  uniform,
} from "three/tsl";

const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();

const dracoLoader = new DRACOLoader();
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.setDRACOLoader(dracoLoader);

export default class Homuncula {
  root = new Group();
  model: Group | null = null;
  moduleGrid: ModuleGrid | null = null;
  floorMat = new MeshStandardNodeMaterial();
  bgColor = new Color(0, 0, 1);
  envRampLow = uniform(new Color(0x000000));
  envRampHigh = uniform(new Color(0xff0000));
  envIntensity = uniform(1);
  pLight = new PointLight(0xffffff, 1);
  scene: Scene;
  camera: PerspectiveCamera;

  constructor({
    scene,
    camera,
    renderer,
  }: {
    scene: Scene;
    camera: PerspectiveCamera;
  }) {
    this.scene = scene;
    scene.background = this.bgColor;
    scene.fog = new FogExp2(scene.background, 0.1);
    scene.fog.color = this.bgColor;

    this.camera = camera;

    this.root.add(this.pLight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = BasicShadowMap;

    this.pLight.castShadow = true;
    this.pLight.shadow.mapSize.width = 1024;
    this.pLight.shadow.mapSize.height = 1024;
    this.pLight.shadow.camera.near = 0.001;
    this.pLight.shadow.camera.far = 1000;
    this.pLight.shadow.bias = -0.00001;

    gltfLoader.load(glbUrl, (gltf) => {
      this.model = gltf.scene;
      this.root.add(this.model);

      const modules = this.model.getObjectByName("modules");

      const floorObject = this.model.getObjectByName("shoot");
      if (!floorObject || !(floorObject as Mesh).isMesh) {
        console.warn("Could not find mesh named 'shoot' in GLB.");
        return;
      }

      const floor = floorObject as Mesh;

      // this.floorMat.copy(floor.material as MeshStandardMaterial);
      // floor.material = this.floorMat;

      if (modules) {
        modules.traverse((child) => {
          if ((child as Mesh).isMesh) {
            child.castShadow = true;
            if (!child.name.includes("pipes")) {
              child.receiveShadow = true;
            }
          }
        });

        this.moduleGrid = new ModuleGrid(modules as Group, {
          columns: 16,
          rows: 16,
        });
        this.root.add(this.moduleGrid.root);
      } else {
        console.warn("Could not find group named 'modules' in GLB.");
      }
    });

    const faceCenter = attribute("_facecenter", "vec3" as const);

    const distanceToCenter = distance(faceCenter.xy, vec2(0, 0));

    const hasFaceCenter = select(distanceToCenter.greaterThan(0), 1, 0);

    const wave = distance(faceCenter.xy, vec2(0, 0))
      .mul(10)
      // .sub(time.mul(3))
      .sin()
      .remap(-1, 1, 0, 0.05);

    const noise = mx_worley_noise_float(
      vec3(faceCenter.x.mul(5), faceCenter.y.mul(5), 0),
    ).mul(1);

    this.floorMat.positionNode = positionLocal.add(
      0,
      wave.add(noise.mul(wave.abs())).mul(hasFaceCenter),
      0,
    );

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
    deltaFrame,
    scene,
  }: {
    params: any;
    deltaFrame: number;
    scene?: any;
  }) {
    this.bgColor.set(...params.bgColor);
    (this.scene.fog as FogExp2).density = params.fogDensity;

    this.envRampLow.value.set(...params.envRampLow);
    this.envRampHigh.value.set(...params.envRampHigh);
    this.envIntensity.value = params.envIntensity;

    this.moduleGrid?.update(deltaFrame);

    this.pLight.distance = 0;
    this.pLight.power = 100;
    this.pLight.decay = 2;

    this.pLight.position.copy(this.camera.position);
    this.pLight.position.z = this.camera.position.z - 3;

    this.pLight.shadow.needsUpdate = true;
  }
}
