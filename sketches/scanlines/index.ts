import { Node, WebGPURenderer } from "three/webgpu";
import { scanlines } from "./scanlines";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { scanlinesParams } from "./config";

export default class Scanlines {
  uniforms = convertParamsToUniforms(scanlinesParams);
  scanlines_resolutionY = this.uniforms.scanlines_resolutionY || 1080;
  renderer: WebGPURenderer;

  constructor({ renderer }: { renderer: WebGPURenderer }) {
    this.renderer = renderer;
  }

  getWebGPUPass(prevPass: Node): Node {
    let p = prevPass;
    p = scanlines(
      p,
      this.uniforms.intensity,
      this.uniforms.density,
      this.uniforms.speed,
      this.uniforms.flicker,
      this.uniforms.vignette,
      this.scanlines_resolutionY,
    );
    return p;
  }

  update({ params, scene }) {
    this.scanlines_resolutionY = scene.renderer.domElement.height || 1080;
    updateUniforms(scanlinesParams, this.uniforms, params);
  }
}
