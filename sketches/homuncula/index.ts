import {
  Group,
  EquirectangularReflectionMapping,
  MeshStandardNodeMaterial,
  Mesh,
  MeshStandardMaterial,
  FogExp2,
  Color,
} from "three/webgpu";
import type { Scene } from "three/webgpu";
import { GLTFLoader, RGBELoader, DRACOLoader } from "three-stdlib";

import ModuleGrid from "./ModuleGrid";
import hdrUrl from "./venice_sunset_1k.hdr?url";
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
  scene: Scene;

  constructor({ scene }: { scene: Scene }) {
    this.scene = scene;
    scene.background = this.bgColor;
    scene.fog = new FogExp2(scene.background, 0.1);
    scene.fog.color = this.bgColor;

    gltfLoader.load(glbUrl, (gltf) => {
      this.model = gltf.scene;
      this.root.add(this.model);

      const modules = this.model.getObjectByName("modules");
      if (modules) {
        this.moduleGrid = new ModuleGrid(modules as Group, {
          columns: 16,
          rows: 16,
        });
        this.root.add(this.moduleGrid.root);
      } else {
        console.warn("Could not find group named 'modules' in GLB.");
      }

      const floorObject = this.model.getObjectByName("floor");
      if (!floorObject || !(floorObject as Mesh).isMesh) {
        console.warn("Could not find mesh named 'floor' in GLB.");
        return;
      }

      const floor = floorObject as Mesh;

      this.floorMat.copy(floor.material as MeshStandardMaterial);
      floor.material = this.floorMat;
      this.floorMat.needsUpdate = true;
    });

    const faceCenter = attribute("_facecenter", "vec3" as const);

    const distanceToCenter = distance(faceCenter.xy, vec2(0, 0));

    const hasFaceCenter = select(distanceToCenter.greaterThan(0), 1, 0);

    const wave = distance(faceCenter.xy, vec2(0, 0))
      .mul(10)
      .sub(time.mul(3))
      .sin()
      .remap(-1, 1, 0, 0.05);

    const noise = mx_worley_noise_float(
      vec3(faceCenter.x.mul(5), faceCenter.y.mul(5), time.mul(1)),
    ).mul(1);

    this.floorMat.positionNode = positionLocal.add(
      0,
      wave.add(noise.mul(wave.abs())).mul(hasFaceCenter),
      0,
    );

    rgbeLoader.load(hdrUrl, (texture) => {
      texture.mapping = EquirectangularReflectionMapping;

      scene.environment = texture;
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

    this.moduleGrid?.update(deltaFrame);
  }
}
