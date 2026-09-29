import {
  attribute,
  cos,
  mx_noise_float,
  mx_worley_noise_float,
  positionWorld,
  sin,
  smoothstep,
  step,
  time,
  vec2,
  vec3,
} from "three/tsl";

export const pipeSparkShape = (
  creatureWorldPos: any,
  pipeSparkUniforms: Record<string, any>,
  pipeSparkDelta: any,
) => {
  const pipeIndex = attribute("_pipeindex", "float" as const);
  const pipeOffset = pipeIndex.mul(pipeSparkUniforms.pipeSparkOffsetAmp);

  const distanceFromCenter = positionWorld.xz.distance(creatureWorldPos.xz);

  const wL = pipeSparkUniforms.pipeSparkWaveLength;

  const pL = pipeSparkUniforms.pipeSparkPulseLength;
  const delta = sin(
    distanceFromCenter.mul(wL).add(pipeSparkDelta.mul(wL)).add(pipeOffset),
  );

  const l = wL.mul(pL);
  const threshold = cos(l);

  const fadeOff = l.mul(pipeSparkUniforms.pipeSparkFadeOff);

  const pulse = smoothstep(
    threshold.sub(fadeOff),
    threshold.add(fadeOff),
    delta,
  );

  return vec3(pulse);
};
