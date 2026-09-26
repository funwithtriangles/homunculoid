import { Node, WebGPURenderer } from "three/webgpu";
import { chromaticAberration } from "./chromaticAberration";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { chromaticAberrationParamsConfig } from "./config";
import { uniform } from "three/tsl";

export default class ChromaticAberration {
  uniforms = convertParamsToUniforms(chromaticAberrationParamsConfig);
  virtualResolutionY = uniform(1080);
  getWebGPUPass(prevPass: Node): Node {
    let p = prevPass;
    p = chromaticAberration(
      p,
      this.uniforms.intensity,
      this.uniforms.edgeStart,
      this.uniforms.falloff,
      this.uniforms.redOffset,
      this.uniforms.blueOffset,
      this.virtualResolutionY,
    );
    return p;
  }

  update({ params, scene }) {
    const pxRatio = scene.renderer.getPixelRatio();
    this.virtualResolutionY.value =
      scene.renderer.domElement.height / pxRatio || 1080;
    updateUniforms(chromaticAberrationParamsConfig, this.uniforms, params);
  }
}
