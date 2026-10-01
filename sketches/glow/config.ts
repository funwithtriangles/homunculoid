export const glowParams = [
  {
    key: "glowStrength",
    defaultValue: 1,
    sliderMin: 0,
    sliderMax: 3,
    step: 0.01,
  },
  {
    key: "glowRadius",
    defaultValue: 1,
    sliderMin: 0,
    sliderMax: 4,
    step: 0.01,
  },
];

export default {
  title: "Glow",
  params: glowParams,
};
