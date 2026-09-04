import {
  ShaderNodeObject,
  Fn,
  screenUV,
  time,
  float,
  sin,
  vec2,
  vec4,
  mul,
  add,
  div,
} from "three/tsl";
import { Node } from "three/webgpu";

export const scanlines = (
  prevPass: ShaderNodeObject<Node>,
  intensity: Node,
  density: Node,
  speed: Node,
  flicker: Node,
  vignette: Node,
  resolutionY: Node,
): ShaderNodeObject<Node> =>
  Fn(() => {
    const densityScale = div(resolutionY, float(1080));
    const normalizedDensity = mul(density, densityScale);
    const scanlineWave = sin(
      screenUV.y.mul(normalizedDensity).add(time.mul(speed)),
    );
    const scanlineMask = scanlineWave.mul(0.5).add(0.5);
    const scanlineDarken = float(1).sub(scanlineMask.mul(intensity));

    const flickerWave = sin(time.mul(speed).mul(3.1));
    const flickerMask = add(
      mul(flickerWave, flicker),
      float(1).sub(mul(flicker, float(0.5))),
    );

    const centeredUV = screenUV.sub(vec2(0.5, 0.5));
    const edgeDistance = centeredUV.length();
    const vignetteMask = float(1).sub(edgeDistance.mul(vignette)).max(0);

    const rgb = prevPass.rgb
      .mul(scanlineDarken)
      .mul(flickerMask)
      .mul(vignetteMask);

    return vec4(rgb, prevPass.a);
  })();
