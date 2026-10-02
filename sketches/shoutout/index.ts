import { Node } from "three/webgpu";
import { WebGPURenderer } from "three/webgpu";
import {
  convertToTexture,
  mix,
  mx_noise_float,
  screenUV,
  step,
  smoothstep,
  texture,
  uniform,
  vec2,
  vec4,
} from "three/tsl";
import { Shoutout } from "./shoutout";

const canvasAspectRatio = 1920 / 1080;
const revealFeather = 0.06;

export default class ShoutoutSketch {
  shoutout = new Shoutout();
  shoutoutTexture = texture(this.shoutout.texture);
  fitScaleX = uniform(1);
  fitScaleY = uniform(1);
  reveal = uniform(1);

  getWebGPUPass(prevPass: Node): Node {
    const fitUV = screenUV
      .sub(vec2(0.5, 0.5))
      .div(vec2(this.fitScaleX, this.fitScaleY))
      .add(vec2(0.5, 0.5));
    const insideCanvas = step(0, fitUV.x)
      .mul(step(fitUV.x, 1))
      .mul(step(0, fitUV.y))
      .mul(step(fitUV.y, 1));
    const shoutout = this.shoutoutTexture.sample(fitUV);
    const base = convertToTexture(prevPass).sample(screenUV);
    const noise = mx_noise_float(fitUV.mul(8)).remap(
      -1,
      1,
      revealFeather,
      1 - revealFeather,
    );
    const revealMask = smoothstep(
      noise.sub(revealFeather),
      noise.add(revealFeather),
      this.reveal,
    );
    const textAlpha = shoutout.a.mul(insideCanvas).mul(revealMask);

    return vec4(mix(base.rgb, shoutout.rgb, textAlpha), base.a);
  }

  update({
    params,
    scene,
  }: {
    params: any;
    scene: { renderer: WebGPURenderer };
  }) {
    const { width, height } = scene.renderer.domElement;
    if (width > 0 && height > 0) {
      const screenAspectRatio = width / height;
      this.fitScaleX.value = Math.min(1, canvasAspectRatio / screenAspectRatio);
      this.fitScaleY.value = Math.min(1, screenAspectRatio / canvasAspectRatio);
    }

    this.reveal.value = params.reveal;
    this.shoutout.update({ params });
  }

  dispose() {
    this.shoutout.dispose();
  }
}
