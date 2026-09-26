import { Node, WebGPURenderer } from "three/webgpu";
import { scanlines } from "./scanlines";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { scanlinesParams } from "./config";
import { uniform } from "three/tsl";

export default class Scanlines {
  uniforms = convertParamsToUniforms(scanlinesParams);
  virtualResolutionY = uniform(1080);
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
      this.virtualResolutionY,
    );
    return p;
  }

  update({
    params,
    scene,
  }: {
    params: any;
    scene: { renderer: WebGPURenderer };
  }) {
    const pxRatio = scene.renderer.getPixelRatio();
    this.virtualResolutionY.value =
      scene.renderer.domElement.height / pxRatio || 1080;
    updateUniforms(scanlinesParams, this.uniforms, params);
  }
}
