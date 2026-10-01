import { BlendMode, MaterialBlending, Node, PassNode } from "three/webgpu";
import { mrt, output, vec4 } from "three/tsl";
import { gaussianBlur } from "./gaussianBlur";
import { convertParamsToUniforms, updateUniforms } from "../../uniformsUtils";
import { glowParams } from "./config";

export default class Glow {
  uniforms = convertParamsToUniforms(glowParams);
  renderPassNode: PassNode | null = null;

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
    return prevPass.add(glow.mul(this.uniforms.glowStrength));
  }

  dispose() {
    this.renderPassNode?.setMRT(null);
  }

  update({ params }: { params: Record<string, any> }) {
    updateUniforms(glowParams, this.uniforms, params);
  }
}
