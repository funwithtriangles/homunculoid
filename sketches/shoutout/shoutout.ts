import { CanvasTexture } from "three";

type ShoutoutParams = {
  color: [number, number, number];
  opacity: number;
  rotation: number;
  message: string;
  message2: string;
  positionX: number;
  positionY: number;
  positionX2: number;
  positionY2: number;
  scale: number;
  scale2: number;
};

export class Shoutout {
  canvas = document.createElement("canvas");
  context = this.canvas.getContext("2d")!;
  texture: CanvasTexture;

  constructor() {
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    this.configureContext();

    this.texture = new CanvasTexture(this.canvas);
    this.texture.flipY = false;
  }

  update({ params }: { params: ShoutoutParams }) {
    const { color, opacity, rotation } = params;
    this.context.fillStyle = `rgba(${color
      .map((channel) => channel * 255)
      .join(", ")}, ${opacity})`;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawMessage(
      params.message,
      params.positionX,
      params.positionY,
      params.scale,
      rotation,
    );
    this.drawMessage(
      params.message2,
      params.positionX2,
      params.positionY2,
      params.scale2,
      rotation,
    );

    this.texture.needsUpdate = true;
  }

  private drawMessage(
    message: string,
    positionX: number,
    positionY: number,
    scale: number,
    rotation: number,
  ) {
    this.context.save();
    this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.context.rotate(rotation);
    this.context.translate(
      positionX * this.canvas.width - this.canvas.width / 2,
      positionY * this.canvas.height - this.canvas.height / 2,
    );
    this.context.scale(scale, scale);
    this.context.fillText(message, 0, 0);
    this.context.restore();
  }

  dispose() {
    this.texture.dispose();
  }

  private configureContext() {
    this.context.font = '700 48px "Roboto Condensed Variable"';
    this.context.letterSpacing = "0.2em";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
  }
}
