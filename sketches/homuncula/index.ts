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
  Object3D,
  Vector3,
} from "three/webgpu";
import type {
  Scene,
  PerspectiveCamera,
  WebGPURenderer,
  Bone,
} from "three/webgpu";
import { GLTFLoader, RGBELoader, DRACOLoader } from "three-stdlib";

import ModuleGrid from "./ModuleGrid";
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

const dracoLoader = new DRACOLoader();
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.setDRACOLoader(dracoLoader);

const isMesh = (object: any): object is Mesh => object.isMesh;

interface BoneItem {
  bone: Bone;
  index: number;
}

export default class Homuncula {
  root = new Group();
  model: Group | null = null;
  moduleGrid: ModuleGrid | null = null;
  pipeMat = new MeshStandardNodeMaterial();
  bgColor = new Color(0, 0, 1);
  // Render group so the value is uploaded once per render, not per render object.
  envRampLow = uniform(new Color(0x000000)).setGroup(renderGroup);
  envRampHigh = uniform(new Color(0xff0000)).setGroup(renderGroup);
  envIntensity = uniform(1).setGroup(renderGroup);
  pipeSparkColor = uniform(new Color(0xffffff));
  pLight = new PointLight(0xffffff, 1);
  scene: Scene;
  camera: PerspectiveCamera;
  armLBones: Bone[] = [];
  armRBones: Bone[] = [];
  spineBones: Bone[] = [];
  legLBones: Bone[] = [];
  legRBones: Bone[] = [];
  neckBones: Bone[] = [];
  bodyBones: BoneItem[] = [];
  boneWiggleTime = 0;

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
      this.root.add(this.model);

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

        this.moduleGrid = new ModuleGrid(modules as Group, {
          columns: 16,
          rows: 16,
        });
        this.root.add(this.moduleGrid.root);
      } else {
        console.warn("Could not find group named 'modules' in GLB.");
      }

      this.armLBones = this.registerBoneChain(
        this.model.getObjectByName("Arm003L") as Bone,
      );
      this.armRBones = this.registerBoneChain(
        this.model.getObjectByName("Arm003R") as Bone,
      );
      // this.spineBones = this.registerBoneChain(
      //   this.model.getObjectByName("spine001") as Bone,
      //   (bone) => bone.name.includes("spine"),
      // );

      this.legRBones = this.registerBoneChain(
        this.model.getObjectByName("Leg008R") as Bone,
      );
      this.legLBones = this.registerBoneChain(
        this.model.getObjectByName("Leg008L") as Bone,
      );

      this.neckBones = this.registerBoneChain(
        this.model.getObjectByName("head") as Bone,
      );

      this.spineBones = this.registerBoneChain(
        this.model.getObjectByName("head") as Bone,
        (bone) =>
          bone.name.includes("spine") ||
          bone.name.includes("head") ||
          bone.name.includes("neck"),
      );

      this.bodyBones = [
        ...this.spineBones.map((bone, index) => ({ bone, index })),
        ...this.armLBones.map((bone, index) => ({ bone, index: index + 6 })),
        ...this.armRBones.map((bone, index) => ({ bone, index: index + 6 })),
        ...this.legLBones.map((bone, index) => ({ bone, index: index + 4 })),
        ...this.legRBones.map((bone, index) => ({ bone, index: index + 4 })),
      ];
      //   {
      //     bone: this.model.getObjectByName("head") as Bone,
      //     index: 0,
      //   },
      //   {
      //     bone: this.model.getObjectByName("neck") as Bone,
      //     index: 1,
      //   },
      //   // {
      //   //   bone: this.model.getObjectByName("Arm003L") as Bone,
      //   //   index: 2,
      //   // },
      //   // {
      //   //   bone: this.model.getObjectByName("Arm003R") as Bone,
      //   //   index: 2,
      //   // },
      //   // ...this.armLBones.map((bone, index) => ({
      //   //   bone,
      //   //   index: index + 2,
      //   // })),
      //   // ...this.armRBones.map((bone, index) => ({
      //   //   bone,
      //   //   index: index + 2,
      //   // })),
      //   ...this.spineBones.map((bone, index) => ({ bone, index: index + 2 })),
      //   // ...this.legLBones.map((bone, index) => ({
      //   //   bone,
      //   //   index: index + 3 + this.spineBones.length,
      //   // })),
      //   // ...this.legRBones.map((bone, index) => ({
      //   //   bone,
      //   //   index: index + 3 + this.spineBones.length,
      //   // })),
      // ];
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

  registerBoneChain = (
    topBone: Bone,
    filter: (bone: Bone) => boolean = () => true,
  ) => {
    const chain: Bone[] = [];
    topBone.traverse((bone) => {
      if (!filter(bone as Bone)) return;
      bone.userData.originalRotation = bone.rotation.clone();
      chain.push(bone as Bone);
    });
    return chain;
  };

  waveBones = (
    bones: Bone[],
    {
      waveAmpZ,
      waveAmpY,
      positionOffset = 0,
    }: {
      waveAmpZ: number;
      waveAmpY: number;
      positionOffset?: number;
    },
  ) => {
    bones.forEach((bone, i) => {
      bone.rotation.copy(bone.userData.originalRotation);

      const position = ((i + positionOffset) % bones.length) / bones.length;
      const phase = (position + this.boneWiggleTime) * Math.PI * 2;
      const strengthZ = Math.sin(phase) * (position + 0.2);
      const strengthY = Math.cos(phase) * (position + 0.2);

      bone.rotation.z += strengthZ * waveAmpZ;
      bone.rotation.y += strengthY * waveAmpY;
    });
  };

  update({
    params,
    deltaTime,
    scene,
  }: {
    params: any;
    deltaFrame: number;
    scene?: any;
  }) {
    this.boneWiggleTime += deltaTime * 0.5;

    this.bgColor.set(...params.bgColor);
    (this.scene.fog as FogExp2).density = params.fogDensity;

    this.envRampLow.value.set(...params.envRampLow);
    this.envRampHigh.value.set(...params.envRampHigh);
    this.envIntensity.value = params.envIntensity;

    this.pipeSparkColor.value.set(...params.pipeSparkColor);

    this.moduleGrid?.update(this.camera.position);

    this.pLight.distance = 0;
    this.pLight.power = params.pLightIntensity;
    this.pLight.color.set(...params.pLightColor);
    this.pLight.decay = 2;

    this.pLight.position.copy(this.camera.position);
    this.pLight.position.z = this.camera.position.z - 3;

    this.pLight.shadow.needsUpdate = true;

    const waveAmpZ = 0.1;
    const waveAmpY = 0.1;

    // this.waveBones(this.armLBones, { waveAmpZ, waveAmpY, positionOffset: -1 });
    // this.waveBones(this.armRBones, { waveAmpZ, waveAmpY, positionOffset: -1 });
    // this.waveBones(this.spineBones, { waveAmpZ, waveAmpY, positionOffset: 1 });
    // this.waveBones(this.legLBones, {
    //   waveAmpZ: waveAmpZ,
    //   waveAmpY: waveAmpY,
    //   positionOffset: 3,
    // });
    // this.waveBones(this.legRBones, {
    //   waveAmpZ: waveAmpZ,
    //   waveAmpY: waveAmpY,
    //   positionOffset: 3,
    // });

    // this.waveBones(this.neckBones, {
    //   waveAmpZ: waveAmpZ,
    //   waveAmpY: waveAmpY,
    //   positionOffset: 0,
    // });

    // const shoulderBoneL = this.armLBones[0];
    // const shoulderBoneR = this.armRBones[0];
    // if (shoulderBoneL && shoulderBoneR) {
    //   shoulderBoneL.rotation.y +=
    //     Math.sin(this.boneWiggleTime * Math.PI * 2) * 0.5;
    //   shoulderBoneR.rotation.y +=
    //     Math.sin(this.boneWiggleTime * Math.PI * 2) * 0.5;
    // }

    const mainWiggleAmp = 0.2;
    const rotSpeed = 0.8;

    this.root.position.x =
      Math.sin(this.boneWiggleTime * Math.PI * 2) * mainWiggleAmp * 3;
    this.root.position.z =
      Math.cos(this.boneWiggleTime * Math.PI * 2) * mainWiggleAmp * 3;

    this.root.rotation.y = -this.boneWiggleTime * Math.PI * 2 * rotSpeed;

    this.bodyBones.forEach(({ bone, index }) => {
      const originalRotation = bone.userData.originalRotation;

      if (!originalRotation) return;

      bone.rotation.copy(bone.userData.originalRotation);

      const position = (index % 13) / 13;
      const phase = position * Math.PI * 2;
      const strengthZ = Math.sin(phase * 2 + this.boneWiggleTime * 2);
      const strengthY = Math.cos(phase * 2 + this.boneWiggleTime * 2);

      // bone.rotateOnWorldAxis(
      //   new Vector3(0, 0, 1),
      //   strengthY * 0.1 * mainWiggleAmp,
      // );

      bone.rotation.x += strengthY * mainWiggleAmp * rotSpeed;
      bone.rotation.z += strengthZ * mainWiggleAmp * rotSpeed;
      bone.rotation.y += strengthY * mainWiggleAmp * rotSpeed;
    });
  }
}
