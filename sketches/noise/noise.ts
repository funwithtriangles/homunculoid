import {
  ShaderNodeObject,
  Fn,
  screenUV,
  time,
  fract,
  vec3,
  float,
  sin,
  add,
  mul,
} from "three/tsl";
import { Node } from "three/webgpu";

// Taken from https://github.com/felixturner/tsl-gradient-pills/blob/main/src/PostFX.js
export const noise = (
  prevPass: ShaderNodeObject<Node>,
  intensity: Node,
  speed: Node,
): ShaderNodeObject<Node> =>
  Fn(() => {
    // Animated time seed for flickering
    const timeSeed = fract(time.mul(speed));

    // RGB sensor noise using sin/fract hash with different seeds per channel
    const seed1 = add(
      mul(screenUV.x, float(12.9898)),
      mul(screenUV.y, float(78.233)),
    ).add(timeSeed);
    const seed2 = add(
      mul(screenUV.x, float(93.9898)),
      mul(screenUV.y, float(67.345)),
    ).add(timeSeed);
    const seed3 = add(
      mul(screenUV.x, float(43.332)),
      mul(screenUV.y, float(93.532)),
    ).add(timeSeed);

    const noiseR = fract(mul(sin(seed1), float(43758.5453)));
    const noiseG = fract(mul(sin(seed2), float(43758.5453)));
    const noiseB = fract(mul(sin(seed3), float(43758.5453)));

    const noiseVec = vec3(noiseR, noiseG, noiseB);
    const noiseOffset = noiseVec.sub(0.5).mul(intensity);

    return prevPass.add(noiseOffset);
  })();
