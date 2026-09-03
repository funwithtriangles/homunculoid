import { Group, Object3D } from "three/webgpu";
import { ImprovedNoise } from "three-stdlib";

const CELL_WIDTH = 5;

const perlin = new ImprovedNoise();

export interface ModuleGridOptions {
  columns?: number;
  rows?: number;
  /** Width/depth of a single module footprint. Measured from the modules when omitted. */
  cellSize?: number;
  /** Snap each placed module to a random multiple of 90 degrees. */
  randomRotation?: boolean;
  /** World units travelled towards the camera per frame. */
  flySpeed?: number;
  /** Grid cells per noise unit: lower values give larger patches of the same module. */
  noiseScale?: number;
  seed?: number;
}

export default class ModuleGrid {
  root = new Group();
  modules: Object3D[] = [];
  rowGroups: Group[] = [];
  columns: number;
  rows: number;
  cellSize: number;
  randomRotation: boolean;
  flySpeed: number;
  noiseScale: number;
  private randomState: number;
  private noiseOffset: number;
  private nextRowIndex = 0;

  constructor(modulesGroup: Group, options: ModuleGridOptions = {}) {
    const {
      columns = 8,
      rows = 8,
      randomRotation = true,
      flySpeed = 0.05,
      noiseScale = 2,
      seed = 1,
    } = options;

    this.columns = columns;
    this.rows = rows;
    this.randomRotation = randomRotation;
    this.flySpeed = flySpeed;
    this.noiseScale = noiseScale;
    this.randomState = seed >>> 0 || 1;
    this.noiseOffset = seed * 13.37;

    this.modules = [...modulesGroup.children];
    this.modules.forEach((module) => (module.visible = false));

    this.cellSize = options.cellSize ?? CELL_WIDTH;

    this.build();
  }

  private get offsetX() {
    return ((this.columns - 1) * this.cellSize) / 2;
  }

  private get offsetZ() {
    return ((this.rows - 1) * this.cellSize) / 2;
  }

  /** Deterministic 0..1 generator so a given seed always rebuilds the same grid. */
  private random() {
    this.randomState = (this.randomState * 1664525 + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  /** Picks a module by thresholding perlin noise into even bands, one per module. */
  private moduleAt(column: number, rowIndex: number) {
    const noise = perlin.noise(
      column * this.noiseScale + this.noiseOffset,
      rowIndex * this.noiseScale + this.noiseOffset,
      this.noiseOffset,
    );

    const normalised = Math.min(Math.max(noise * 0.5 + 0.5, 0), 0.999999);

    return this.modules[Math.floor(normalised * this.modules.length)];
  }

  private fillRow(row: Group, rowIndex: number) {
    row.clear();
    row.userData.rowIndex = rowIndex;

    for (let column = 0; column < this.columns; column++) {
      const cell = this.moduleAt(column, rowIndex).clone(true);

      cell.visible = true;
      cell.position.set(column * this.cellSize - this.offsetX, 0, 0);

      if (this.randomRotation) {
        cell.rotation.y = Math.floor(this.random() * 2) * Math.PI;
      }

      row.add(cell);
    }
  }

  build() {
    this.clear();

    if (this.modules.length === 0) return;

    for (let index = 0; index < this.rows; index++) {
      const row = new Group();

      row.position.z = index * this.cellSize - this.offsetZ;
      this.fillRow(row, -index);

      this.root.add(row);
      this.rowGroups.push(row);
    }

    this.nextRowIndex = -this.rows;
  }

  update(deltaFrame = 1) {
    if (this.rowGroups.length === 0 || this.flySpeed === 0) return;

    const depth = this.rows * this.cellSize;
    // Recycled once a row is a full cell past the front edge, so it pops in out of view.
    const recycleEdge = this.offsetZ + this.cellSize;

    this.rowGroups.forEach((row) => {
      row.position.z += this.flySpeed * deltaFrame;

      if (row.position.z > recycleEdge) {
        row.position.z -= depth;
        this.fillRow(row, this.nextRowIndex--);
      }
    });
  }

  clear() {
    this.rowGroups.forEach((row) => this.root.remove(row));
    this.rowGroups.length = 0;
  }

  regenerate(seed = Math.floor(Math.random() * 0xffffffff)) {
    this.randomState = seed >>> 0 || 1;
    this.noiseOffset = seed * 13.37;
    this.build();
  }
}
