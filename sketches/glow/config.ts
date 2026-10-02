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
  {
    key: "trailIntensity",
    defaultValue: 1,
    sliderMin: 0,
    sliderMax: 5,
    step: 0.01,
  },
  {
    key: "trailMixAmp",
    defaultValue: 0.5,
    sliderMin: 0,
    sliderMax: 0.98,
    step: 0.01,
  },
  {
    key: "trailRotation",
    defaultValue: 0,
    sliderMin: -0.1,
    sliderMax: 0.1,
    step: 0.001,
  },
  {
    key: "trailScale",
    defaultValue: 0,
    sliderMin: -0.1,
    sliderMax: 0.1,
    step: 0.001,
  },
  {
    key: "trailSpeed",
    defaultValue: 0,
    sliderMin: 0,
    sliderMax: 0.01,
    step: 0.0001,
  },
  {
    key: "trailDirectionX",
    defaultValue: 0,
    sliderMin: -1,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "trailDirectionY",
    defaultValue: 0,
    sliderMin: -1,
    sliderMax: 1,
    step: 0.01,
  },
];

export default {
  title: "Glow",
  params: glowParams,
};
