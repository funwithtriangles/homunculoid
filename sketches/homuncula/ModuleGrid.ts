import { Group, Object3D, Vector3 } from "three/webgpu";
import { ImprovedNoise } from "three-stdlib";

const CELL_WIDTH = 5;

const perlin = new ImprovedNoise();

const moduleNames = ["fat", "thin", "shoot"];

export interface ModuleGridOptions {
  columns?: number;
  rows?: number;
  /** Width/depth of a single module footprint. Measured from the modules when omitted. */
  cellSize?: number;
  /** Optional object pinned to the reserved shoot module when rows recycle. */
  creature?: Object3D;
  /** Snap each placed module to a random multiple of 90 degrees. */
  randomRotation?: boolean;
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
  noiseScale: number;
  creature: Object3D | null;
  isVisible: boolean;
  private randomState: number;
  private noiseOffset: number;
  private pools: Object3D[][] = [];
  private creatureRow: Group | null = null;
  private creatureCell: Object3D | null = null;
  private creatureX = 0;
  private creaturePosition = new Vector3();

  constructor(modulesGroup: Group, options: ModuleGridOptions = {}) {
    const {
      columns = 8,
      rows = 8,
      creature = null,
      randomRotation = true,
      noiseScale = 1,
      seed = 1,
    } = options;

    this.columns = columns;
    this.rows = rows;
    this.creature = creature;
    this.randomRotation = randomRotation;
    this.noiseScale = noiseScale;
    this.randomState = seed >>> 0 || 1;
    this.noiseOffset = seed * 13.37;
    this.isVisible = true;

    this.modules = moduleNames
      .map((name) => modulesGroup.getObjectByName(name)!)
      .filter(Boolean);
    this.modules.forEach((module) => (module.visible = false));
    this.pools = this.modules.map(() => []);

    this.cellSize = options.cellSize ?? CELL_WIDTH;

    this.build();
  }

  private get offsetX() {
    return ((this.columns - 1) * this.cellSize) / 2;
  }

  private get offsetZ() {
    return ((this.rows - 1) * this.cellSize) / 2;
  }

  private get shootModuleIndex() {
    return this.modules.findIndex((module) => module.name === "shoot");
  }

  private columnX(column: number) {
    return column * this.cellSize - this.offsetX;
  }

  private clampColumn(column: number) {
    return Math.min(Math.max(column, 0), this.columns - 1);
  }

  private forcedShootColumn(row: Group) {
    return this.clampColumn(
      Math.round(
        (this.creatureX - row.position.x + this.offsetX) / this.cellSize,
      ),
    );
  }

  private placeCreatureAt(cell: Object3D) {
    if (!this.creature) return;

    cell.getWorldPosition(this.creaturePosition);
    this.creature.parent?.worldToLocal(this.creaturePosition);
    this.creature.position.copy(this.creaturePosition);
  }

  /** Deterministic 0..1 generator so a given seed always rebuilds the same grid. */
  private random() {
    this.randomState = (this.randomState * 1664525 + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  /** Picks a module by thresholding perlin noise into even bands, one per module. */
  private moduleIndexAt(column: number, rowIndex: number) {
    const noise = perlin.noise(
      column * this.noiseScale + this.noiseOffset,
      rowIndex * this.noiseScale + this.noiseOffset,
      this.noiseOffset,
    );

    const normalised = Math.min(Math.max(noise * 0.5 + 0.5, 0), 0.999999);

    return Math.floor(normalised * this.modules.length);
  }

  /** Pools mean a module is only ever cloned while the grid warms up. */
  private acquire(moduleIndex: number) {
    const cell =
      this.pools[moduleIndex].pop() ?? this.modules[moduleIndex].clone(true);

    cell.visible = true;
    cell.userData.moduleIndex = moduleIndex;

    return cell;
  }

  private release(cell: Object3D) {
    this.pools[cell.userData.moduleIndex]?.push(cell);
  }

  private fillRow(row: Group, rowIndex: number) {
    row.children.forEach((cell) => this.release(cell));
    row.clear();
    row.userData.rowIndex = rowIndex;
    if (row === this.creatureRow) this.creatureCell = null;

    const forcedColumn =
      row === this.creatureRow && this.shootModuleIndex !== -1
        ? this.forcedShootColumn(row)
        : -1;

    for (let column = 0; column < this.columns; column++) {
      const moduleIndex =
        column === forcedColumn
          ? this.shootModuleIndex
          : this.moduleIndexAt(column, rowIndex);
      const cell = this.acquire(moduleIndex);

      cell.position.set(this.columnX(column), 0, 0);

      if (this.randomRotation) {
        cell.rotation.y = Math.floor(this.random() * 2) * Math.PI;
      } else {
        cell.rotation.y = 0;
      }

      if (forcedColumn !== -1 && Math.abs(column - forcedColumn) <= 3) {
        cell.rotation.y = column < forcedColumn ? Math.PI / 2 : -Math.PI / 2;
      }

      row.add(cell);

      if (column === forcedColumn) {
        this.creatureCell = cell;
        this.placeCreatureAt(cell);
      }
    }
  }

  private findClosestRow(z: number) {
    return this.rowGroups.reduce<Group | null>((closest, row) => {
      if (!closest) return row;
      return Math.abs(row.position.z - z) < Math.abs(closest.position.z - z)
        ? row
        : closest;
    }, null);
  }

  private ensureCreatureRow(cameraPosition: Vector3) {
    if (!this.creature || this.shootModuleIndex === -1) return;

    if (!this.creatureRow) {
      this.creatureX = cameraPosition.x;
      this.creatureRow = this.findClosestRow(cameraPosition.z);
      if (this.creatureRow) {
        this.fillRow(this.creatureRow, this.creatureRow.userData.rowIndex);
      }
    }
  }

  setCreature(creature: Object3D | null) {
    if (this.creature === creature) return;

    const previousCreatureRow = this.creatureRow;
    this.creature = creature;
    this.creatureRow = null;
    this.creatureCell = null;

    if (previousCreatureRow) {
      this.fillRow(previousCreatureRow, previousCreatureRow.userData.rowIndex);
    }
  }

  build() {
    this.clear();

    if (this.modules.length === 0) return;

    for (let index = 0; index < this.rows; index++) {
      const row = new Group();

      row.position.z = index * this.cellSize - this.offsetZ;
      row.position.x = Math.random() * 6 - 3;
      this.fillRow(row, -index);

      this.root.add(row);
      this.rowGroups.push(row);
    }
  }

  /** Keeps the rows wrapped around the camera, which does the travelling. */
  update(cameraPosition: Vector3) {
    if (this.rowGroups.length === 0) return;

    this.ensureCreatureRow(cameraPosition);
    this.creatureX = cameraPosition.x;

    this.root.visible = this.isVisible;

    const depth = this.rows * this.cellSize;
    // A row is recycled once it's behind the camera by half the grid depth.
    const behind = cameraPosition.z + (this.cellSize * this.rows) / 2;

    this.rowGroups.forEach((row) => {
      while (row.position.z > behind) {
        row.position.z -= depth;
        this.fillRow(row, row.userData.rowIndex - this.rows);
      }

      while (row.position.z < behind - depth) {
        row.position.z += depth;
        this.fillRow(row, row.userData.rowIndex + this.rows);
      }
    });
  }

  clear() {
    this.rowGroups.forEach((row) => {
      row.children.forEach((cell) => this.release(cell));
      row.clear();
      this.root.remove(row);
    });
    this.rowGroups.length = 0;
    this.creatureRow = null;
    this.creatureCell = null;
  }

  regenerate(seed = Math.floor(Math.random() * 0xffffffff)) {
    this.randomState = seed >>> 0 || 1;
    this.noiseOffset = seed * 13.37;
    this.build();
  }
}
