export default {
  defaultTitle: "Camera",
  params: [
    {
      groupTitle: "Positioning",
      params: [
        {
          key: "rotSpeed",
          defaultValue: 0,
          sliderMax: 0.2,
        },
        {
          key: "lookAtPosY",
          defaultValue: 0,
          sliderMax: 10,
        },
        {
          key: "camY",
          defaultValue: 0,
          sliderMin: -10,
          sliderMax: 10,
        },
        {
          key: "orbitRot",
          defaultValue: 0,
          sliderMax: Math.PI * 2,
          sliderMin: 0,
        },
        {
          key: "orbitRad",
          defaultValue: 1,
          sliderMax: 20,
        },
        {
          key: "bigOrbitRad",
          defaultValue: 1,
          sliderMin: 1,
          sliderMax: 100,
        },
        {
          key: "headCamDistance",
          defaultValue: 0,
          sliderMax: 20,
        },
        {
          key: "isRotating",
          title: "Auto Rotate",
          valueType: "boolean",
          defaultValue: false,
        },
      ],
    },
    {
      groupTitle: "Perspective",
      params: [
        {
          key: "fov",
          defaultValue: 75,
          sliderMin: 1,
          sliderMax: 179,
        },
        {
          key: "perspectiveZoom",
          defaultValue: 1,
          sliderMin: 1,
          sliderMax: 5,
        },
        {
          key: "filmOffset",
          defaultValue: 0,
          sliderMin: -100,
          sliderMax: 100,
        },
      ],
    },
    {
      groupTitle: "Orthographic",
      params: [
        {
          key: "orthographicZoom",
          defaultValue: 1,
          sliderMin: 0.01,
          sliderMax: 5,
        },
      ],
    },
    {
      groupTitle: "Modes",
      params: [
        {
          key: "mode",
          title: "Camera Mode",
          valueType: "enum",
          defaultValue: "orbit",
          options: [
            {
              label: "Orbit",
              value: "orbit",
            },
            {
              label: "Close Up",
              value: "closeUp",
            },
          ],
        },
        {
          key: "cameraType",
          title: "Camera Type",
          valueType: "enum",
          defaultValue: "perspective",
          options: [
            {
              label: "Perspective",
              value: "perspective",
            },
            {
              label: "Orthographic",
              value: "orthographic",
            },
          ],
        },
      ],
    },
  ],
};
