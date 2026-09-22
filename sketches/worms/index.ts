import * as THREE from "three";
import { MathNodeParameter } from "three/src/nodes/TSL.js";
import {
  abs,
  add,
  clamp,
  color,
  cos,
  densityFogFactor,
  div,
  float,
  Fn,
  fog,
  hash,
  instanceIndex,
  max,
  mix,
  mul,
  positionView,
  range,
  renderGroup,
  sin,
  smoothstep,
  step,
  sub,
  time,
  uniform,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import { SpriteNodeMaterial } from "three/webgpu";
import config from "./config";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";

interface SketchConstructorArg {
  camera: THREE.Camera;
}

interface UpdateParams {
  params: Record<string, any>;
  deltaFrame: number;
  camera?: THREE.Camera;
}

const wormLength = 30;
const numWorms = 1000;
const instanceCount = wormLength * numWorms;

export default class Worms {
  uniforms = convertParamsToUniforms(config.params);
  particleMaterial = new SpriteNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  instancedSprite = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    this.particleMaterial,
  );
  root = new THREE.Group();
  cameraX = uniform(0).setGroup(renderGroup);
  cameraY = uniform(0).setGroup(renderGroup);
  cameraZ = uniform(0).setGroup(renderGroup);
  swimTime = uniform(0);
  sketchApi: SketchConstructorArg;

  constructor(sketchApi: SketchConstructorArg) {
    this.sketchApi = sketchApi;

    // Positions come from the shader, so the origin bounding sphere would cull it.
    this.instancedSprite.frustumCulled = false;

    const xRange = 50;
    const yRange = 100;
    const xRangeNode = float(xRange);
    const yRangeNode = float(yRange);
    const zRange = float(100);
    this.instancedSprite.count = instanceCount;
    this.root.add(this.instancedSprite);

    const floatIndex = float(instanceIndex);

    const startRange = hash(floatIndex.div(numWorms)).mul(zRange);
    // const baseX = hash(instanceIndex.div(wormLength)).sub(0.5).mul(xRange);
    const baseX = hash(floatIndex.add(321).div(wormLength)).mul(xRangeNode);
    const baseY = hash(floatIndex.div(wormLength).add(422)).mul(yRangeNode);

    const scale = range(0.1, 1);

    // Wrapped around the camera, so the worms always surround it as it travels.
    const basePosX = this.cameraX.add(
      baseX.sub(this.cameraX).mod(xRangeNode).sub(xRangeNode.mul(0.5)),
    );
    const basePosY = this.cameraY.add(
      baseY.sub(this.cameraY).mod(yRangeNode).sub(yRangeNode.mul(0.5)),
    );
    const basePosZ = this.cameraZ.add(
      startRange.sub(this.cameraZ).mod(zRange).sub(zRange.mul(0.5)),
    );
    // const scaleRange = range(0.3, 2);
    // const rotateRange = range(0.1, 4);

    // const life = lifeTime.div(lifeRange);

    this.particleMaterial.transparent = true;

    this.particleMaterial.colorNode = Fn(() => {
      const solidAlpha = float(1);
      const ringRad = this.uniforms.ringRad;
      const ringThickness = float(0.01);
      const glowSpread = this.uniforms.glowSpread;
      const opacity = float(0.2);

      const distanceToCenter = uv().sub(0.5).length();

      const alphaSolid = step(div(ringRad, 2), distanceToCenter)
        .oneMinus()
        .mul(solidAlpha);

      // const alphaSolid = stroke(distanceToCenter, ringRad, ringThickness).mul(
      //   solidAlpha
      // );

      // const alphaSolid = stroke(hexSDF(uv()), 0.8, 0.02);

      const alphaGlow = div(glowSpread, distanceToCenter).sub(
        mul(glowSpread, 2),
      );
      alphaGlow.mulAssign(alphaSolid.oneMinus());
      ``;
      const alphaFinal = max(alphaGlow, alphaSolid).mul(opacity);

      const finalColor = mix(vec3(1, 1, 1), vec3(1, 1, 1), 1);
      // return vec4(1, 0, 0);
      return vec4(vec3(this.uniforms.color), alphaFinal);
    })();

    this.particleMaterial.opacityNode = Fn(() => {
      const d = float(0.05);
      return densityFogFactor(d).oneMinus();
    })();

    const delta = float(instanceIndex).mul(this.uniforms.pointDist);

    // this.particleMaterial.positionNode = offsetRange.sub(vec3(0, 0, basePosZ));
    this.particleMaterial.positionNode = vec3(
      basePosX.add(
        cos(delta.add(this.swimTime).mul(this.uniforms.xSpeed)).mul(
          this.uniforms.xRad,
        ),
      ),
      basePosY
        .add(
          sin(delta.add(this.swimTime).mul(this.uniforms.ySpeed)).mul(
            this.uniforms.yRad,
          ),
        )
        .add(40),
      basePosZ.add(
        cos(delta.add(this.swimTime).mul(this.uniforms.zSpeed)).mul(
          this.uniforms.zRad,
        ),
      ),
    );

    this.particleMaterial.rotationNode = vec3(0, 2, 0);
    this.particleMaterial.scaleNode = scale;
  }

  update({ params: p, deltaFrame: f, camera }: UpdateParams) {
    const activeCamera = camera ?? this.sketchApi?.camera;

    this.cameraX.value = activeCamera?.position.x ?? 0;
    this.cameraY.value = activeCamera?.position.y ?? 0;
    this.cameraZ.value = activeCamera?.position.z ?? 0;
    this.swimTime.value += p.swimSpeed * f;

    // this.instancedSprite.scale.set(10, 10, 10);

    updateUniforms(config.params, this.uniforms, p);
  }
}
