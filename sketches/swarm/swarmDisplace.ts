import { positionLocal, sin, cos, vec3 } from "three/tsl";

export const swarmDisplace = ({
  uniforms: {
    wiggleWaveLength,
    wiggleAmp,
    radialWaveLength,
    radialAmp,
    radialOffsetAmp,
    radialOffsetWaveLength,
  },
  ringAngle,
}: {
  uniforms: Record<string, any>;
  ringAngle: any;
}) => {
  const radialDir = vec3(cos(ringAngle), 0, sin(ringAngle));

  const radialDisplaceOffset = sin(ringAngle.mul(radialOffsetWaveLength)).mul(
    radialOffsetAmp,
  );

  const radialDisplace = radialDir
    .mul(sin(positionLocal.y.mul(radialWaveLength).add(radialDisplaceOffset)))
    .mul(radialAmp);

  const ringTangent = vec3(sin(ringAngle).negate(), 0, cos(ringAngle));

  const wiggleDisplace = ringTangent.mul(
    sin(positionLocal.y.mul(wiggleWaveLength)).mul(wiggleAmp),
  );

  return radialDisplace.add(wiggleDisplace);
};
