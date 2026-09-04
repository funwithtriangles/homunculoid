export const chromaticAberrationParamsConfig = [
  {
    key: "intensity",
    defaultValue: 2,
    sliderMin: 0,
    sliderMax: 24,
  },
  {
    key: "edgeStart",
    defaultValue: 0.8,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "falloff",
    defaultValue: 0.5,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "redOffset",
    defaultValue: 2,
    sliderMin: -10,
    sliderMax: 10,
    step: 0.1,
  },
  {
    key: "blueOffset",
    defaultValue: -2,
    sliderMin: -10,
    sliderMax: 10,
    step: 0.1,
  },
];

export default {
  title: "Chromatic Aberration",
  params: chromaticAberrationParamsConfig,
};
