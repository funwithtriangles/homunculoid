import { Node, PassNode } from "three/webgpu";

import { ShaderNodeObject } from "three/tsl";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import config from "./config";
import { noise } from "./noise";

export default class Noise {
  uniforms = convertParamsToUniforms(config.params);

  getWebGPUPass(
    prevPass: ShaderNodeObject<Node>,
    renderPassNode: ShaderNodeObject<PassNode>,
  ): ShaderNodeObject<Node> {
    return noise(prevPass, this.uniforms.intensity, this.uniforms.speed);
  }

  update({ params, deltaFrame, scene }) {
    updateUniforms(config.params, this.uniforms, params);
  }
}
