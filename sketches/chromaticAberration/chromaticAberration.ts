import {
  Fn,
  screenUV,
  vec2,
  vec3,
  float,
  vec4,
  div,
  mul,
  max,
  convertToTexture,
} from "three/tsl";
import { Node } from "three/webgpu";

export const chromaticAberration = (
  input: Node,
  intensity: Node,
  edgeStart: Node,
  falloff: Node,
  redOffset: Node,
  blueOffset: Node,
  resolutionY: Node,
) =>
  Fn(() => {
    const passTex = convertToTexture(input);
    const centeredUV = screenUV.sub(vec2(0.5, 0.5));
    const edgeDistance = centeredUV.length().mul(1.41421356237);
    const edgeRange = float(1).sub(edgeStart).max(0.0001);
    const edgeMask = edgeDistance
      .sub(edgeStart)
      .max(0)
      .div(edgeRange)
      .pow(falloff);

    const dir = centeredUV.div(centeredUV.length().max(0.0001));
    const pixelToUv = div(float(1), max(resolutionY, float(1)));
    const baseShift = mul(mul(edgeMask, intensity), pixelToUv);

    const shiftR = mul(baseShift, redOffset);
    const shiftB = mul(baseShift, blueOffset);

    const uvR = screenUV.add(dir.mul(shiftR));
    const uvG = screenUV;
    const uvB = screenUV.sub(dir.mul(shiftB));

    const r = passTex.sample(uvR).r;
    const g = passTex.sample(uvG).g;
    const b = passTex.sample(uvB).b;
    const a = passTex.sample(screenUV).a;

    return vec4(vec3(r, g, b), a);
  })();
