import fontUrl from "@fontsource-variable/roboto-condensed/files/roboto-condensed-latin-wght-normal.woff2?url";
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
  time,
  uniform,
  vec2,
  vec4,
  vec3,
} from "three/tsl";
import { Shoutout } from "./shoutout";
import { ensureFontInjected } from "./fontUtils";

const canvasAspectRatio = 1920 / 1080;

export default class ShoutoutSketch {
  shoutout = new Shoutout();
  shoutoutTexture = texture(this.shoutout.texture);
  fitScaleX = uniform(1);
  fitScaleY = uniform(1);
  reveal = uniform(1);
  revealFeather = uniform(0.06);
  noiseScale = uniform(8);
  noiseSpeed = uniform(0);
  warpNoiseScale = uniform(8);
  warpNoiseSpeed = uniform(0.2);
  warpAmp = uniform(0.01);

  constructor() {
    ensureFontInjected({
      fontFamily: "Roboto Condensed Variable",
      fontUrl: fontUrl,
      fontWeight: "100 900",
      format: "woff2-variations",
    });
  }

  getWebGPUPass(prevPass: Node): Node {
    const fitUV = screenUV
      .sub(vec2(0.5, 0.5))
      .div(vec2(this.fitScaleX, this.fitScaleY))
      .add(vec2(0.5, 0.5));
    const insideCanvas = step(0, fitUV.x)
      .mul(step(fitUV.x, 1))
      .mul(step(0, fitUV.y))
      .mul(step(fitUV.y, 1));
    const warpCoords = vec3(
      fitUV.mul(this.warpNoiseScale),
      time.mul(this.warpNoiseSpeed),
    );
    const warpX = mx_noise_float(warpCoords);
    const warpY = mx_noise_float(warpCoords.add(vec3(13.7, 31.4, 8.1)));
    const warpedUV = fitUV.add(vec2(warpX, warpY).mul(this.warpAmp));
    const shoutout = this.shoutoutTexture.sample(warpedUV);
    const base = convertToTexture(prevPass).sample(screenUV);
    const feather = this.revealFeather.max(0.0001);
    const noise = mx_noise_float(
      vec3(fitUV.mul(this.noiseScale), time.mul(this.noiseSpeed)),
    ).remap(-1, 1, feather, feather.oneMinus());
    const revealMask = smoothstep(
      noise.sub(feather),
      noise.add(feather),
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
    this.revealFeather.value = params.revealFeather;
    this.noiseScale.value = params.noiseScale;
    this.noiseSpeed.value = params.noiseSpeed;
    this.warpNoiseScale.value = params.warpNoiseScale;
    this.warpNoiseSpeed.value = params.warpNoiseSpeed;
    this.warpAmp.value = params.warpAmp;
    this.shoutout.update({ params });
  }

  dispose() {
    this.shoutout.dispose();
  }
}
