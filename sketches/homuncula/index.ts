import {
  Group,
  EquirectangularReflectionMapping,
  MeshStandardNodeMaterial,
  Mesh,
  DoubleSide,
  MeshNormalNodeMaterial,
} from "three/webgpu";
import { GLTFLoader, RGBELoader } from "three-stdlib";

import hdrUrl from "./venice_sunset_1k.hdr?url";
import glbUrl from "./homuncula.glb?url";
import {
  attribute,
  mul,
  mx_worley_noise_float,
  positionLocal,
  positionWorld,
  select,
  vec3,
} from "three/tsl";

const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();

export default class Homuncula {
  root = new Group();
  model: Group | null = null;
  // TODO: Remove DoubleSide
  floorMat = new MeshNormalNodeMaterial({ side: DoubleSide, wireframe: false });
  // floorMat = new MeshStandardNodeMaterial();

  constructor({ scene }: { scene: any }) {
    gltfLoader.load(glbUrl, (gltf) => {
      this.model = gltf.scene;
      this.root.add(this.model);

      const floorObject = this.model.getObjectByName("floor");
      if (!floorObject || !(floorObject as Mesh).isMesh) {
        console.warn("Could not find mesh named 'floor' in GLB.");
        return;
      }

      const floor = floorObject as Mesh;
      floor.material = this.floorMat;
      this.floorMat.needsUpdate = true;
    });

    const faceCenter = attribute("_facecenter", "vec3");
    const hasFaceCenter = faceCenter.length().greaterThan(0);
    const noise = mx_worley_noise_float(mul(faceCenter.xy, 2)).mul(0.05);
    const offset = select(hasFaceCenter, noise, 0);

    this.floorMat.positionNode = positionLocal.add(0, offset, 0);

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
  }) {}
}
