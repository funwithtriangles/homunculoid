import { positionLocal, sin, cos, vec3 } from "three/tsl";

export const swarmDisplace = ({
  yGroupTravel,
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
  yGroupTravel: any;
}) => {
  const radialDir = vec3(cos(ringAngle), 0, sin(ringAngle));

  const radialDisplaceOffset = sin(ringAngle.mul(radialOffsetWaveLength)).mul(
    radialOffsetAmp,
  );

  // Group travel is removed so the displacement rides along with it instead of scrolling through it.
  const travelY = positionLocal.y.sub(yGroupTravel);

  const radialDisplace = radialDir
    .mul(sin(travelY.mul(radialWaveLength).add(radialDisplaceOffset)))
    .mul(radialAmp);

  const ringTangent = vec3(sin(ringAngle).negate(), 0, cos(ringAngle));

  const wiggleDisplace = ringTangent.mul(
    sin(travelY.mul(wiggleWaveLength)).mul(wiggleAmp),
  );

  return radialDisplace.add(wiggleDisplace);
};
