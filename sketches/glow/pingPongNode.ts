import {
  Node,
  NodeBuilder,
  NodeFrame,
  NodeMaterial,
  NodeUpdateType,
  PassNode,
  QuadMesh,
  RenderTarget,
  RendererUtils,
  TempNode,
  TextureNode,
  Vector2,
} from "three/webgpu";
import {
  convertToTexture,
  Fn,
  passTexture,
  texture,
  uv,
  type ShaderNodeObject,
} from "three/tsl";

type ComposeFn = (
  textureNew: ShaderNodeObject<TextureNode>,
  textureOld: ShaderNodeObject<TextureNode>,
) => ShaderNodeObject<Node>;

const size = new Vector2();
const quadMesh = new QuadMesh();
let rendererState: ReturnType<typeof RendererUtils.resetRendererState>;

class PingPongNode extends TempNode {
  static get type() {
    return "PingPongNode";
  }

  textureNode: ShaderNodeObject<TextureNode>;
  composeFn: ComposeFn;
  compRT = new RenderTarget(1, 1, { depthBuffer: false });
  oldRT = new RenderTarget(1, 1, { depthBuffer: false });
  textureOutput: ReturnType<typeof passTexture>;
  textureOld: ShaderNodeObject<TextureNode>;
  composedMaterial: NodeMaterial | null = null;

  constructor(
    textureNode: ShaderNodeObject<TextureNode>,
    composeFn: ComposeFn,
  ) {
    super("vec4");
    this.textureNode = textureNode;
    this.composeFn = composeFn;
    this.textureOutput = passTexture(
      this as unknown as PassNode,
      this.compRT.texture,
    );
    this.textureOld = texture(this.oldRT.texture);
    this.updateBeforeType = NodeUpdateType.FRAME;
  }

  getTextureNode(): ShaderNodeObject<Node> {
    return this.textureOutput as unknown as ShaderNodeObject<Node>;
  }

  updateBefore(frame: NodeFrame): void {
    const renderer = frame.renderer!;
    rendererState = RendererUtils.resetRendererState(renderer, rendererState);

    const inputTexture = this.textureNode.value;
    renderer.getDrawingBufferSize(size);
    this.compRT.setSize(size.x, size.y);
    this.oldRT.setSize(size.x, size.y);
    this.compRT.texture.type = inputTexture.type;
    this.oldRT.texture.type = inputTexture.type;
    this.textureOutput.value = this.compRT.texture;
    this.textureOld.value = this.oldRT.texture;

    quadMesh.material = this.composedMaterial!;
    quadMesh.name = "Glow PingPong";
    renderer.setRenderTarget(this.compRT);
    quadMesh.render(renderer);

    [this.compRT, this.oldRT] = [this.oldRT, this.compRT];
    RendererUtils.restoreRendererState(renderer, rendererState);
  }

  setup(builder: NodeBuilder) {
    this.textureOld.uvNode = this.textureNode.uvNode || uv();
    const compose = Fn(() => this.composeFn(this.textureNode, this.textureOld));
    const material =
      this.composedMaterial || (this.composedMaterial = new NodeMaterial());
    material.name = "Glow PingPong";
    material.fragmentNode = compose();

    builder.getNodeProperties(this).textureNode = this.textureNode;
    return this.textureOutput;
  }

  dispose(): void {
    this.compRT.dispose();
    this.oldRT.dispose();
    this.composedMaterial?.dispose();
  }
}

export const pingPong = (node: ShaderNodeObject<Node>, composeFn: ComposeFn) =>
  new PingPongNode(convertToTexture(node), composeFn);
