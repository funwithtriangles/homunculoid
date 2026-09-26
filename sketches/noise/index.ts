import { Node, PassNode, Vector2 } from "three/webgpu";

import { ShaderNodeObject, uniform, vec2 } from "three/tsl";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import config from "./config";
import { noise } from "./noise";

export default class Noise {
  uniforms = convertParamsToUniforms(config.params);
  pxDensity = uniform(1);
  virtualRes = uniform(vec2(1920, 1080));

  getWebGPUPass(
    prevPass: ShaderNodeObject<Node>,
    renderPassNode: ShaderNodeObject<PassNode>,
  ): ShaderNodeObject<Node> {
    return noise(
      prevPass,
      this.uniforms.intensity,
      this.uniforms.speed,
      this.virtualRes,
    );
  }

  update({ params, deltaFrame, scene }) {
    const pxDensity = scene.renderer.getPixelRatio();
    this.pxDensity.value = pxDensity;
    this.virtualRes.value.set(
      scene.renderer.domElement.width / pxDensity,
      scene.renderer.domElement.height / pxDensity,
    );
    updateUniforms(config.params, this.uniforms, params);
  }
}
