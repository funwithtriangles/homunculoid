export const homunculaUniformParams = [
  {
    key: "armBandLimbOffset",
    defaultValue: 318,
    sliderMin: 0,
    sliderMax: 500,
  },
  {
    key: "armBandGridX",
    defaultValue: 3,
    sliderMin: 1,
    sliderMax: 16,
    step: 0.1,
  },
  {
    key: "armBandGridY",
    defaultValue: 4,
    sliderMin: 1,
    sliderMax: 16,
    step: 0.1,
  },
  {
    key: "armBandFadeTopStart",
    defaultValue: 0,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "armBandFadeTopEnd",
    defaultValue: 0.3,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "armBandFadeBottomStart",
    defaultValue: 0.7,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "armBandFadeBottomEnd",
    defaultValue: 1,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "armBandMasterLineWidth",
    defaultValue: 1,
    sliderMin: 0,
    sliderMax: 4,
    step: 0.01,
  },
  {
    key: "armBandBigWaveFreq",
    defaultValue: 10,
    sliderMin: 0,
    sliderMax: 40,
    step: 0.1,
  },
  {
    key: "armBandBigWidthMin",
    defaultValue: 0.1,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "armBandBigWidthMax",
    defaultValue: 0.2,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "armBandSmallNoiseScale",
    defaultValue: 30,
    sliderMin: 0,
    sliderMax: 100,
    step: 0.1,
  },
  {
    key: "armBandSmallWidthMin",
    defaultValue: 0.05,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "armBandSmallWidthMax",
    defaultValue: 0.2,
    sliderMin: 0,
    sliderMax: 1,
    step: 0.01,
  },
  {
    key: "armBandDisplaceFreq",
    defaultValue: 10,
    sliderMin: 0,
    sliderMax: 40,
    step: 0.1,
  },
  {
    key: "armBandDisplaceAmp",
    defaultValue: 0.05,
    sliderMin: 0,
    sliderMax: 0.3,
    step: 0.001,
  },
];

export const homunculaArmBandSpeedParams = [
  {
    key: "armBandMasterSpeed",
    defaultValue: 1,
    sliderMin: -4,
    sliderMax: 4,
    step: 0.01,
  },
  {
    key: "armBandOrbitSpeed",
    defaultValue: 0.5,
    sliderMin: -10,
    sliderMax: 10,
    step: 0.01,
  },
  {
    key: "armBandBigNoiseSpeed",
    defaultValue: 5,
    sliderMin: -40,
    sliderMax: 40,
    step: 0.1,
  },
  {
    key: "armBandSmallNoiseSpeed",
    defaultValue: 2.5,
    sliderMin: -40,
    sliderMax: 40,
    step: 0.1,
  },
  {
    key: "armBandDisplaceSpeed",
    defaultValue: 0.25,
    sliderMin: -10,
    sliderMax: 10,
    step: 0.01,
  },
];

export default {
  defaultTitle: "Homuncula",
  params: [
    {
      groupTitle: "Scene",
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
          key: "hideFloor",
          valueType: "boolean",
          defaultValue: false,
        },
      ],
    },
    {
      groupTitle: "Environment",
      params: [
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
    },
    {
      groupTitle: "Creature",
      params: [
        {
          key: "isCreatureVisible",
          valueType: "boolean",
          defaultValue: false,
        },
        {
          key: "swimSpeed",
          defaultValue: 0,
          sliderMin: 0,
          sliderMax: 10,
        },
        {
          key: "swimAmp",
          defaultValue: 0.5,
          sliderMin: 0,
          sliderMax: 1.5,
        },
        {
          key: "swimFreq",
          defaultValue: 0.6,
          sliderMin: 0,
          sliderMax: 3,
        },
        {
          key: "swimTurnSpeed",
          defaultValue: 0.6,
          sliderMin: 0,
          sliderMax: 3,
        },
        {
          key: "swimWaveLength",
          defaultValue: 0.8,
          sliderMin: 0.2,
          sliderMax: 2,
        },
        {
          key: "swimStiffness",
          defaultValue: 0.05,
          sliderMin: 0,
          sliderMax: 1,
        },
        {
          key: "swimTwist",
          defaultValue: 0.3,
          sliderMin: -1,
          sliderMax: 1,
        },
        {
          key: "limbAmp",
          defaultValue: 0.5,
          sliderMin: 0,
          sliderMax: 1,
        },
        {
          key: "limbLag",
          defaultValue: 0.15,
          sliderMin: -0.5,
          sliderMax: 0.5,
        },
      ],
    },
    {
      groupTitle: "Path",
      params: [
        {
          key: "swimPathRadius",
          defaultValue: 1,
          sliderMin: 0,
          sliderMax: 4,
        },
        {
          key: "swimPathPitch",
          defaultValue: 0,
          sliderMin: -1,
          sliderMax: 1,
        },
        {
          key: "swimPathFollow",
          valueType: "boolean",
          defaultValue: true,
        },
        {
          key: "swimPathRoll",
          defaultValue: 0,
          sliderMin: -3.142,
          sliderMax: 3.142,
        },
      ],
    },
    {
      groupTitle: "Armbands",
      params: [...homunculaUniformParams, ...homunculaArmBandSpeedParams],
    },
  ],
  shots: [
    {
      key: "creatureReset",
    },
  ],
};
