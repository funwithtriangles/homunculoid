import { Group, Object3D } from "three/webgpu";

const CELL_WIDTH = 5;

export interface ModuleGridOptions {
  columns?: number;
  rows?: number;
  /** Width/depth of a single module footprint. Measured from the modules when omitted. */
  cellSize?: number;
  /** Snap each placed module to a random multiple of 90 degrees. */
  randomRotation?: boolean;
  /** World units travelled towards the camera per frame. */
  flySpeed?: number;
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
  private randomState: number;

  constructor(modulesGroup: Group, options: ModuleGridOptions = {}) {
    const {
      columns = 8,
      rows = 8,
      randomRotation = true,
      flySpeed = 0.05,
      seed = 1,
    } = options;

    this.columns = columns;
    this.rows = rows;
    this.randomRotation = randomRotation;
    this.flySpeed = flySpeed;
    this.randomState = seed >>> 0 || 1;

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

  private fillRow(row: Group) {
    row.clear();

    for (let column = 0; column < this.columns; column++) {
      const source =
        this.modules[Math.floor(this.random() * this.modules.length)];
      const cell = source.clone(true);

      cell.visible = true;
      cell.position.set(column * this.cellSize - this.offsetX, 0, 0);

      if (this.randomRotation) {
        cell.rotation.y = Math.floor(this.random() * 4) * (Math.PI / 2);
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
      this.fillRow(row);

      this.root.add(row);
      this.rowGroups.push(row);
    }
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
        this.fillRow(row);
      }
    });
  }

  clear() {
    this.rowGroups.forEach((row) => this.root.remove(row));
    this.rowGroups.length = 0;
  }

  regenerate(seed = Math.floor(Math.random() * 0xffffffff)) {
    this.randomState = seed >>> 0 || 1;
    this.build();
  }
}
