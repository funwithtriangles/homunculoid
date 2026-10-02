export const shoutoutParams = [
  {
    key: "message",
    title: "Message",
    valueType: "string",
    defaultValue: "Hello, world!",
  },
  {
    key: "message2",
    title: "Message 2",
    valueType: "string",
    defaultValue: "Shoutout!",
  },
  {
    key: "color",
    title: "Color",
    valueType: "rgb",
    defaultValue: [1, 1, 1],
  },
  {
    key: "positionX",
    title: "Position X",
    defaultValue: 0,
    sliderMin: -1,
    sliderMax: 1,
  },
  {
    key: "positionX2",
    title: "Position X 2",
    defaultValue: 0,
    sliderMin: -1,
    sliderMax: 1,
  },
  {
    key: "positionY",
    title: "Position Y",
    defaultValue: 0,
    sliderMin: -0.5,
    sliderMax: 0.5,
  },
  {
    key: "positionY2",
    title: "Position Y 2",
    defaultValue: 0,
    sliderMin: -0.5,
    sliderMax: 0.5,
  },
  {
    key: "scale",
    title: "Scale",
    defaultValue: 1,
    sliderMin: 0.1,
    sliderMax: 3,
  },
  {
    key: "scale2",
    title: "Scale 2",
    defaultValue: 1,
    sliderMin: 0.1,
    sliderMax: 3,
  },
  {
    key: "rotation",
    title: "Rotation",
    defaultValue: 0,
    sliderMin: -Math.PI,
    sliderMax: Math.PI,
  },
  {
    key: "opacity",
    title: "Opacity",
    defaultValue: 1,
    sliderMin: 0,
    sliderMax: 1,
  },
  {
    key: "reveal",
    title: "Reveal",
    defaultValue: 1,
    sliderMin: 0,
    sliderMax: 1,
  },
];

export default {
  title: "Shoutout",
  params: shoutoutParams,
};
