import { color, uniform } from "three/tsl";
import { Color } from "three/webgpu";

// Define the shape of a uniform parameter with better typing
interface UniformParamConfig {
  key: string;
  defaultValue: any;
  valueType?: "rgb" | "number";
}

// Helper type to infer the correct uniform type based on valueType
type UniformValueType<T extends UniformParamConfig> =
  T["valueType"] extends "rgb"
    ? Color
    : T["valueType"] extends "number"
    ? number
    : T["defaultValue"];

// Create a mapped type that converts the params array to the correct uniform object shape
type UniformsFromParams<T extends readonly UniformParamConfig[]> = {
  [K in T[number]["key"]]: ReturnType<
    typeof uniform<UniformValueType<Extract<T[number], { key: K }>>>
  >;
};

export const convertParamsToUniforms = <
  T extends readonly UniformParamConfig[]
>(
  params: T
): UniformsFromParams<T> => {
  const uniforms = {} as UniformsFromParams<T>;

  const convert = (param: UniformParamConfig) => {
    switch (param.valueType) {
      case "rgb":
        return uniform(new Color(...param.defaultValue));
      case "number":
      default:
        return uniform(param.defaultValue);
    }
  };

  for (const param of params) {
    if ("params" in param) {
      for (const item of param.params) {
        uniforms[item.key] = convert(item);
      }
    } else {
      uniforms[param.key] = convert(param);
    }
  }

  return uniforms;
};

export const updateUniforms = (
  uniformParamConfig: readonly UniformParamConfig[],
  uniforms: UniformsFromParams<any>,
  params: any
) => {
  const config = uniformParamConfig.flatMap((cfg) =>
    "params" in cfg ? cfg.params : [cfg]
  );
  for (const cfg of config) {
    if (!(cfg.key in params)) continue;
    switch (cfg.valueType) {
      case "rgb":
        uniforms[cfg.key].value.set(...params[cfg.key]);
        break;
      case "number":
      default:
        uniforms[cfg.key].value = params[cfg.key];
        break;
    }
  }
};

export const updateUniformsByChannel = (
  uniformParamConfig: readonly UniformParamConfig[],
  uniforms: UniformsFromParams<any>,
  params: any
) => {
  const config = uniformParamConfig.flatMap((cfg) =>
    "params" in cfg ? cfg.params : [cfg]
  );
  for (const cfg of config) {
    const key = `${cfg.key}_${params.matChannelA}`;
    if (!(key in params)) continue;
    switch (cfg.valueType) {
      case "rgb":
        uniforms[cfg.key].value.set(...params[key]);
        break;
      case "number":
      default:
        uniforms[cfg.key].value = params[key];
        break;
    }
  }
};
