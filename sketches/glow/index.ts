import { BlendMode, MaterialBlending, Node, PassNode } from "three/webgpu";
import { max, mrt, output, rotateUV, screenUV, vec2, vec4 } from "three/tsl";
import { gaussianBlur } from "./gaussianBlur";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { glowParams } from "./config";
import { pingPong } from "./pingPongNode";

export default class Glow {
  uniforms = convertParamsToUniforms(glowParams);
  renderPassNode: PassNode | null = null;
  trailPass: ReturnType<typeof pingPong> | null = null;

  getWebGPUPass(prevPass: Node, renderPassNode: PassNode): Node {
    this.renderPassNode = renderPassNode;
    // Materials opt in by writing the colour they want to glow to `glowColor` via their mrtNode.
    renderPassNode.setMRT(
      mrt({ output, glowColor: vec4(0) }).setBlendMode(
        "glowColor",
        // Default is no blending, so additive sprites would overwrite the glow with 0.
        new BlendMode(MaterialBlending),
      ),
    );

    // Sigma is baked into the shader; radius stays a uniform so it can modulate without recompiling.
    const glow = gaussianBlur(
      renderPassNode.getTextureNode("glowColor"),
      this.uniforms.glowRadius,
      4,
      { resolutionScale: 0.5 },
    );
    this.trailPass?.dispose();
    this.trailPass = pingPong(glow, (textureNew, textureOld) => {
      const direction = vec2(
        this.uniforms.trailDirectionX,
        this.uniforms.trailDirectionY,
      ).mul(this.uniforms.trailSpeed);
      const oldUV = rotateUV(screenUV, this.uniforms.trailRotation)
        .sub(vec2(0.5))
        .div(this.uniforms.trailScale.add(1))
        .add(vec2(0.5))
        .add(direction);
      const currentGlow = textureNew.sample(screenUV);
      const previousGlow = textureOld.sample(oldUV);
      const accumulatedGlow = currentGlow.add(
        previousGlow.mul(this.uniforms.trailMixAmp),
      );
      return vec4(
        accumulatedGlow.rgb,
        max(currentGlow.a, previousGlow.a.mul(this.uniforms.trailMixAmp)),
      );
    });

    return prevPass.add(
      this.trailPass
        .getTextureNode()
        .mul(this.uniforms.glowStrength)
        .mul(this.uniforms.trailIntensity),
    );
  }

  dispose() {
    this.trailPass?.dispose();
    this.trailPass = null;
    this.renderPassNode?.setMRT(null);
  }

  update({ params }: { params: Record<string, any> }) {
    updateUniforms(glowParams, this.uniforms, params);
  }
}
