export const swarmUniformParams = [
  {
    key: "wiggleWaveLength",
    defaultValue: 0.1,
    sliderMin: 0,
    sliderMax: 1,
  },
  {
    key: "wiggleAmp",
    defaultValue: 5,
    sliderMin: 0,
    sliderMax: 20,
  },
  {
    key: "radialWaveLength",
    defaultValue: 0.1,
    sliderMin: 0,
    sliderMax: 1,
  },
  {
    key: "radialAmp",
    defaultValue: 5,
    sliderMin: 0,
    sliderMax: 20,
  },
  {
    key: "radialOffsetAmp",
    defaultValue: 0,
    sliderMin: 0,
    sliderMax: 10,
  },
  {
    key: "radialOffsetWaveLength",
    defaultValue: 2,
    sliderMin: 0,
    sliderMax: 20,
  },
];

export default {
  defaultTitle: "Swarm",
  description: "Loads the swarm GLB model",
  params: [
    {
      key: "trackedObjectName",
      valueType: "string",
      defaultValue: "",
    },
    {
      key: "ringRadius",
      defaultValue: 5,
      sliderMin: 0,
      sliderMax: 50,
    },
    {
      key: "layerSpacing",
      defaultValue: 2,
      sliderMin: 0,
      sliderMax: 20,
    },
    {
      key: "layerRadialOffset",
      defaultValue: 0,
      sliderMin: -Math.PI,
      sliderMax: Math.PI,
    },
    {
      key: "yRotSpeed",
      defaultValue: 0,
      sliderMin: -0.2,
      sliderMax: 0.2,
    },
    {
      key: "groupYRotSpeed",
      defaultValue: 0,
      sliderMin: -0.2,
      sliderMax: 0.2,
    },
    {
      key: "ySpeed",
      defaultValue: 0.05,
      sliderMin: -1,
      sliderMax: 1,
    },
    {
      key: "colSpeedMin",
      defaultValue: 0,
      sliderMin: 0,
      sliderMax: 2,
    },
    {
      key: "colSpeedAmp",
      defaultValue: 1,
      sliderMin: 0,
      sliderMax: 2,
    },
    {
      key: "colSpeedWaveLength",
      defaultValue: 12,
      sliderMin: 0,
      sliderMax: 50,
    },
    {
      key: "yStartOffset",
      defaultValue: 6,
      sliderMin: 0,
      sliderMax: 10,
    },
    {
      key: "rowSpacing",
      defaultValue: 2,
      // Non-zero, as loop height is derived from it.
      sliderMin: 0.01,
      sliderMax: 20,
    },
    ...swarmUniformParams,
  ],
};
