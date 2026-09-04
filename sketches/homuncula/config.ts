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
  ],
};
