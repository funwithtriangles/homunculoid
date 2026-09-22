export default {
  defaultTitle: "Homuncula",
  params: [
    {
      key: "bgColor",
      valueType: "rgb",
      defaultValue: [0, 0, 0],
    },
    {
      key: "fogDensity",
      defaultValue: 0.1,
      sliderMin: 0,
      sliderMax: 0.2,
    },
    {
      key: "envRampLow",
      valueType: "rgb",
      defaultValue: [0, 0, 0],
    },
    {
      key: "envRampHigh",
      valueType: "rgb",
      defaultValue: [1, 1, 1],
    },
    {
      key: "envIntensity",
      defaultValue: 1,
      sliderMin: 0,
      sliderMax: 4,
    },
    {
      key: "pLightIntensity",
      defaultValue: 1,
      sliderMin: 0,
      sliderMax: 3,
    },
    {
      key: "pLightColor",
      valueType: "rgb",
      defaultValue: [1, 1, 1],
    },
    {
      key: "pipeSparkColor",
      valueType: "rgb",
      defaultValue: [1, 1, 1],
    },
    {
      key: "isCreatureVisible",
      valueType: "boolean",
      defaultValue: false,
    },
    {
      key: "swimSpeed",
      defaultValue: 0,
      sliderMin: 0,
      sliderMax: 10,
    },
    {
      key: "swimAmp",
      defaultValue: 0.5,
      sliderMin: 0,
      sliderMax: 1.5,
    },
    {
      key: "swimFreq",
      defaultValue: 0.6,
      sliderMin: 0,
      sliderMax: 3,
    },
    {
      key: "swimTurnSpeed",
      defaultValue: 0.6,
      sliderMin: 0,
      sliderMax: 3,
    },
    {
      key: "swimWaveLength",
      defaultValue: 0.8,
      sliderMin: 0.2,
      sliderMax: 2,
    },
    {
      key: "swimStiffness",
      defaultValue: 0.05,
      sliderMin: 0,
      sliderMax: 1,
    },
    {
      key: "swimTwist",
      defaultValue: 0.3,
      sliderMin: -1,
      sliderMax: 1,
    },
    {
      key: "limbAmp",
      defaultValue: 0.5,
      sliderMin: 0,
      sliderMax: 1,
    },
    {
      key: "limbLag",
      defaultValue: 0.15,
      sliderMin: -0.5,
      sliderMax: 0.5,
    },
    {
      key: "swimPathRadius",
      defaultValue: 1,
      sliderMin: 0,
      sliderMax: 4,
    },
    {
      key: "swimPathPitch",
      defaultValue: 0,
      sliderMin: -1,
      sliderMax: 1,
    },
    {
      key: "swimPathFollow",
      valueType: "boolean",
      defaultValue: true,
    },
    {
      key: "swimPathRoll",
      defaultValue: 0,
      sliderMin: -3.142,
      sliderMax: 3.142,
    },
  ],
  shots: [
    {
      key: "creatureReset",
    },
  ],
};
