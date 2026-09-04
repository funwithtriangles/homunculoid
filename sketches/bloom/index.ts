import { Node, WebGPURenderer } from "three/webgpu";
import { bloom } from "./bloom";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { bloomParams } from "./config";

export default class Bloom {
  uniforms = convertParamsToUniforms(bloomParams);
  renderer: WebGPURenderer;
  bloomPass: any;

  constructor({ renderer }: { renderer: WebGPURenderer }) {
    this.renderer = renderer;
  }

  getWebGPUPass(prevPass: Node): Node {
    let p = prevPass;
    this.bloomPass = bloom(p);
    p = p.add(this.bloomPass);
    return p;
  }

  update({ params }) {
    updateUniforms(bloomParams, this.uniforms, params);
    if (this.bloomPass) {
      this.bloomPass.threshold.value = params.threshold;
      this.bloomPass.strength.value = params.strength;
      this.bloomPass.radius.value = params.radius;
    }
  }
}
