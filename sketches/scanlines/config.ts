export const scanlinesParams = [
  {
    key: "intensity",
    defaultValue: 0.15,
    sliderMin: 0,
    sliderMax: 1,
  },
  {
    key: "density",
    defaultValue: 900,
    sliderMin: 100,
    sliderMax: 3000,
  },
  {
    key: "speed",
    defaultValue: 2,
    sliderMin: 0,
    sliderMax: 20,
  },
  {
    key: "flicker",
    defaultValue: 0.05,
    sliderMin: 0,
    sliderMax: 0.5,
  },
  {
    key: "vignette",
    defaultValue: 0.35,
    sliderMin: 0,
    sliderMax: 2,
  },
];

export default {
  title: "Scanlines",
  params: scanlinesParams,
};
