export const bloomParams = [
  {
    key: "threshold",
    defaultValue: 0.85,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "strength",
    defaultValue: 0.5,
    sliderMin: 0,
    sliderMax: 3,
    step: 0.01,
  },
  {
    key: "radius",
    defaultValue: 0.2,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
];

export default {
  title: "Bloom",
  params: bloomParams,
};
