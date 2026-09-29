import {
  attribute,
  cos,
  mx_noise_float,
  mx_worley_noise_float,
  positionLocal,
  positionWorld,
  sin,
  smoothstep,
  step,
  time,
  vec2,
  vec3,
  mx_atan2,
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

export const creatureSparkShape = (
  pipeSparkUniforms: Record<string, any>,
  pipeSparkDelta: any,
  shieldAngleDelta: any,
) => {
  const distanceFromCenter = positionLocal.xz.length();

  const pipeOffset = pipeSparkUniforms.pipeSparkOffsetAmp;

  const wL = pipeSparkUniforms.pipeSparkWaveLength;

  const pL = pipeSparkUniforms.pipeSparkPulseLength.add(
    pipeSparkUniforms.pipeSparkOffsetAmp,
  );

  const delta = sin(
    distanceFromCenter
      .mul(wL)
      .add(pipeSparkDelta.mul(wL))
      .add(pipeOffset)
      .add(pipeSparkUniforms.pipeSparkShieldTiming),
  );

  const nS = pipeSparkUniforms.pipeSparkNoiseScale;

  const angle = mx_atan2(positionLocal.x, positionLocal.z);

  const angleOffset = mx_worley_noise_float(
    angle
      .mul(pipeSparkUniforms.pipeSparkShieldAngleWaveLength)
      .add(distanceFromCenter.mul(pipeSparkUniforms.creatureSparkTwist)),
  ).mul(pipeSparkUniforms.pipeSparkShieldAngleWaveAmp);

  const noise = mx_noise_float(
    vec3(positionLocal.xz.mul(nS), shieldAngleDelta),
  );

  const angleAmp = pipeSparkUniforms.pipeSparkShieldAngleAmp.mul(noise);

  const radialNoise = mx_noise_float(
    distanceFromCenter
      .mul(wL)
      .mul(nS)
      .add(pipeSparkDelta.mul(wL).mul(nS))
      .add(angleOffset.mul(angleAmp)),
  )
    .remap(-1, 1, 0, 1.5)
    .smoothstep(0.8, 0.9);

  const l = wL.mul(pL);
  const threshold = cos(l);

  const fadeOff = l.mul(pipeSparkUniforms.pipeSparkFadeOff);

  const waveMask = smoothstep(
    threshold.sub(fadeOff),
    threshold.add(fadeOff),
    delta,
  );

  const mI = pipeSparkUniforms.pipeSparkShieldMaskInfluence;

  const shieldIndex = attribute("_shield", "float" as const);
  let shieldMask = smoothstep(1.1, 1.4, positionLocal.y);
  shieldMask = shieldMask.max(shieldIndex);

  const pulse = radialNoise
    .mul(waveMask.mul(mI).add(mI.oneMinus()))
    .mul(shieldMask);

  return vec3(pulse);
};
