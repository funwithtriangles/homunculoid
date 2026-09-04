import { Node, WebGPURenderer } from "three/webgpu";
import { chromaticAberration } from "./chromaticAberration";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { chromaticAberrationParamsConfig } from "./config";
import { uniform } from "three/tsl";

export default class ChromaticAberration {
  uniforms = convertParamsToUniforms(chromaticAberrationParamsConfig);
  scanlines_resolutionY = uniform(1080);

  getWebGPUPass(prevPass: Node): Node {
    let p = prevPass;
    p = chromaticAberration(
      p,
      this.uniforms.intensity,
      this.uniforms.edgeStart,
      this.uniforms.falloff,
      this.uniforms.redOffset,
      this.uniforms.blueOffset,
      this.scanlines_resolutionY,
    );
    return p;
  }

  update({ params, scene }) {
    this.scanlines_resolutionY = scene.renderer.domElement.height || 1080;
    updateUniforms(chromaticAberrationParamsConfig, this.uniforms, params);
  }
}
