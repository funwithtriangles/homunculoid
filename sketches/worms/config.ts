export default {
  defaultTitle: "Worms",
  description: "Billboarded worms moving in 3D space",
  params: [
    {
      key: "opacity",
      defaultValue: 0,
    },
    {
      key: "swimSpeed",
      defaultValue: 0,
    },
    {
      key: "color",
      valueType: "rgb",
      defaultValue: [1, 1, 1],
    },
    {
      key: "pointDist",
      defaultValue: 0.05,
      sliderMin: 0.00001,
      sliderMax: 0.1,
    },
    {
      key: "ringRad",
      defaultValue: 0.05,
      sliderMin: 0,
      sliderMax: 1,
    },
    {
      key: "glowSpread",
      defaultValue: 0.02,
      sliderMin: 0,
      sliderMax: 1,
    },
    {
      key: "xSpeed",
      defaultValue: 1,
      sliderMin: 0.0001,
      sliderMax: 3,
    },
    {
      key: "ySpeed",
      defaultValue: 1,
      sliderMin: 0.0001,
      sliderMax: 3,
    },
    {
      key: "zSpeed",
      defaultValue: 1,
      sliderMin: 0.0001,
      sliderMax: 3,
    },
    {
      key: "xRad",
      defaultValue: 1,
      sliderMin: 0.0001,
      sliderMax: 10,
    },
    {
      key: "yRad",
      defaultValue: 1,
      sliderMin: 0.0001,
      sliderMax: 10,
    },
    {
      key: "zRad",
      defaultValue: 1,
      sliderMin: 0.0001,
      sliderMax: 10,
    },
  ],
};
