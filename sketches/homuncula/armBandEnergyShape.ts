import {
  abs,
  attribute,
  float,
  min,
  mx_noise_float,
  normalLocal,
  positionLocal,
  sin,
  step,
  time,
  uv,
  vec2,
} from "three/tsl";

export function armBandEnergyShape(armBandUniforms: Record<string, any>) {
  const limbIndex = attribute("_limbindex", "float" as const);

  const armBandDelta = time
    .add(limbIndex.mul(armBandUniforms.armBandLimbOffset))
    .mul(armBandUniforms.armBandTimeScale);

  const fadeOffTop = uv().y.smoothstep(
    armBandUniforms.armBandFadeTopStart,
    armBandUniforms.armBandFadeTopEnd,
  );
  const fadeOffBottom = uv()
    .y.smoothstep(
      armBandUniforms.armBandFadeBottomStart,
      armBandUniforms.armBandFadeBottomEnd,
    )
    .oneMinus();

  const grid = uv().mul(
    vec2(armBandUniforms.armBandGridX, armBandUniforms.armBandGridY),
  );
  const linePos = mx_noise_float(
    grid.y.add(armBandDelta.mul(armBandUniforms.armBandLineFlow)),
  );

  const dist = abs(
    grid.x.sub(linePos).add(armBandDelta.mul(armBandUniforms.armBandLineFlow)),
  ).mod(1);
  const wrappedDist = min(dist, float(1).sub(dist));

  const widthNoiseBig = sin(
    uv()
      .y.mul(armBandUniforms.armBandBigWaveFreq)
      .sub(armBandDelta.mul(armBandUniforms.armBandBigWaveFlow)),
  ).remap(
    0,
    1,
    armBandUniforms.armBandBigWidthMin,
    armBandUniforms.armBandBigWidthMax,
  );

  const widthNoiseSmall = mx_noise_float(
    positionLocal
      .mul(armBandUniforms.armBandSmallNoiseScale)
      .sub(armBandDelta.mul(armBandUniforms.armBandSmallNoiseFlow)),
  ).remap(
    0,
    1,
    armBandUniforms.armBandSmallWidthMin,
    armBandUniforms.armBandSmallWidthMax,
  );

  const lineWidth = widthNoiseBig
    .add(widthNoiseSmall)
    .mul(fadeOffTop)
    .mul(fadeOffBottom);

  const energyShape = step(wrappedDist, lineWidth);
  const displacement = normalLocal.mul(
    sin(
      uv()
        .y.add(armBandDelta.mul(armBandUniforms.armBandDisplaceFlow))
        .mul(armBandUniforms.armBandDisplaceFreq),
    ),
  );

  return {
    energyShape,
    position: positionLocal.add(
      displacement.mul(armBandUniforms.armBandDisplaceAmp),
    ),
  };
}
