export default {
  defaultTitle: "Particles",
  description: "Simple particle system moving past the screen",
  params: [
    {
      key: "speed",
      defaultValue: 0,
      sliderMin: -0.5,
      sliderMax: 0.5,
    },
    {
      key: "color",
      valueType: "rgb",
      defaultValue: [1, 1, 1],
    },
    {
      key: "opacity",
      valueType: "number",
      defaultValue: 1,
    },
  ],
};
