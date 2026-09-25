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
  uv,
  vec2,
} from "three/tsl";

export function armBandEnergyShape(
  armBandUniforms: Record<string, any>,
  armBandDeltas: Record<string, any>,
) {
  const limbIndex = attribute("_limbindex", "float" as const);
  const limbOffset = limbIndex.mul(armBandUniforms.armBandLimbOffset);
  const shapeDelta = armBandDeltas.shapeRotation.add(limbOffset);

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

  const shapeGrid = uv().mul(
    vec2(armBandUniforms.armBandGridX, armBandUniforms.armBandGridY),
  );
  const linePos = mx_noise_float(shapeGrid.y.add(shapeDelta));

  const dist = abs(shapeGrid.x.sub(linePos).add(shapeDelta)).mod(1);
  const wrappedDist = min(dist, float(1).sub(dist));

  const widthNoiseBig = sin(
    uv()
      .y.mul(armBandUniforms.armBandBigWaveFreq)
      .sub(armBandDeltas.bigNoise.add(limbOffset)),
  ).remap(
    0,
    1,
    armBandUniforms.armBandBigWidthMin,
    armBandUniforms.armBandBigWidthMax,
  );

  const widthNoiseSmall = mx_noise_float(
    positionLocal
      .mul(armBandUniforms.armBandSmallNoiseScale)
      .sub(armBandDeltas.smallNoise.add(limbOffset)),
  ).remap(
    0,
    1,
    armBandUniforms.armBandSmallWidthMin,
    armBandUniforms.armBandSmallWidthMax,
  );

  const lineWidth = widthNoiseBig
    .add(widthNoiseSmall)
    .mul(fadeOffTop)
    .mul(fadeOffBottom)
    .mul(armBandUniforms.armBandMasterLineWidth);

  const energyShape = step(wrappedDist, lineWidth);
  const displacement = normalLocal.mul(
    sin(
      uv()
        .y.add(armBandDeltas.displacement.add(limbOffset))
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
