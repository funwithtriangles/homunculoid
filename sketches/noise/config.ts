export default {
  title: "Noise",
  description: "Simple noise/grain/static",
  params: [
    {
      key: "intensity",
      title: "Intensity",
      defaultValue: 0.1,
      sliderMin: 0,
      sliderMax: 1,
    },
    {
      key: "speed",
      title: "Speed",
      defaultValue: 10,
      sliderMin: 0,
      sliderMax: 100,
    },
  ],
};
