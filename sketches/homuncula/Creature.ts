import {
  abs,
  float,
  min,
  positionGeometry,
  mx_worley_noise_vec2,
  step,
  time,
  uv,
  vec2,
  vec3,
  mx_worley_noise_float,
  mx_noise_float,
  uniform,
  positionLocal,
  normalLocal,
  sin,
  attribute,
} from "three/tsl";
import {
  Bone,
  Color,
  DoubleSide,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  Object3D,
  Quaternion,
  SkeletonHelper,
  SkinnedMesh,
  Vector3,
} from "three/webgpu";

const IDENTITY = new Quaternion();
const UP = new Vector3(0, 1, 0);

/** Rate the carried orientation closes on its target, per second. */
const FOLLOW_SMOOTHING = 0.5;

export interface CreatureParams {
  swimAmp: number;
  swimFreq: number;
  swimTurnSpeed: number;
  swimWaveLength: number;
  swimStiffness: number;
  swimTwist: number;
  limbAmp: number;
  limbLag: number;
  swimPathRadius: number;
  swimPathPitch: number;
  swimPathFollow: boolean;
  swimPathRoll: number;
  swimSpeed: number;
  pipeSparkColor: [number, number, number];
}

/**
 * Drives a bone chain as a fish/snake: a travelling bend wave runs head -> tail
 * while the whole creature rides a helix locked to that wave's phase.
 */
export default class Creature {
  root = new Group();
  model: Object3D;
  bodyMesh: SkinnedMesh | null = null;
  skeletonHelper: SkeletonHelper | null = null;
  turns: number = 0;
  waves: number = 0;
  yPos = 0;

  spineBones: Bone[] = [];
  armLBones: Bone[] = [];
  armRBones: Bone[] = [];
  legLBones: Bone[] = [];
  legRBones: Bone[] = [];
  energyColor = uniform(new Color(0xffffff));

  bodyLength = 1;
  swim = {
    amplitude: 0.5,
    frequency: 0.6,
    waveLength: 0.8,
    stiffness: 0.05,
    spiral: 0,
    twist: 0,
  };

  private bendEuler = new Euler();
  private tmpDelta = new Quaternion();
  private pathTangent = new Vector3();
  private pathRadial = new Vector3();
  private pathBinormal = new Vector3();
  private pathBasis = new Matrix4();
  private rollQuat = new Quaternion();
  private yawQuat = new Quaternion();
  private stepQuat = new Quaternion();
  private renderQuat = new Quaternion();
  private pathPosition = new Vector3();
  private renderPosition = new Vector3();
  private pathQuat = new Quaternion();

  constructor(model: Object3D, { debugSkeleton = false } = {}) {
    this.model = model;
    this.root.add(model);
    this.root.name = "creatureRoot";

    this.bodyMesh = model.getObjectByName("body") as SkinnedMesh | null;

    this.spineBones = this.registerBoneChain(
      model.getObjectByName("head") as Bone,
      (bone) =>
        bone.name.includes("spine") ||
        bone.name.includes("head") ||
        bone.name.includes("neck"),
    );

    this.armLBones = this.registerBoneChain(
      model.getObjectByName("Arm003L") as Bone,
    );
    this.armRBones = this.registerBoneChain(
      model.getObjectByName("Arm003R") as Bone,
    );
    this.legLBones = this.registerBoneChain(
      model.getObjectByName("Leg008L") as Bone,
    );
    this.legRBones = this.registerBoneChain(
      model.getObjectByName("Leg008R") as Bone,
    );

    const armBandL = model.getObjectByName("armBandL") as Mesh | null;
    const armBandR = model.getObjectByName("armBandR") as Mesh | null;
    const legBandL = model.getObjectByName("legBandL") as Mesh | null;
    const legBandR = model.getObjectByName("legBandR") as Mesh | null;

    const energyBandMat = new MeshBasicNodeMaterial();

    energyBandMat.side = DoubleSide;
    armBandL && (armBandL.material = energyBandMat);
    armBandR && (armBandR.material = energyBandMat);
    legBandL && (legBandL.material = energyBandMat);
    legBandR && (legBandR.material = energyBandMat);

    const limbIndex = attribute("_limbindex", "float" as const);

    const delta = time.add(limbIndex.mul(318));

    const fadeOffTop = uv().y.smoothstep(0.0, 0.3);
    const fadeOffBottom = uv().y.smoothstep(0.7, 1.0).oneMinus();

    const grid = uv().mul(vec2(4, 3));
    // const grid = uv().mul(mx_worley_noise_vec2());
    const linePos = mx_noise_float(grid.y.add(delta.mul(1)));
    // const linePos = grid.y.sub(time.mul(1));

    const dist = abs(grid.x.sub(linePos).add(delta.mul(2))).mod(1);
    const wrappedDist = min(dist, float(1).sub(dist));

    const widthNoise = mx_noise_float(uv().y.sub(delta.mul(1))).remap(
      0,
      1,
      0.05,
      0.3,
    );

    const lineWidth = widthNoise.mul(fadeOffTop).mul(fadeOffBottom);

    const line = step(wrappedDist, lineWidth);
    energyBandMat.transparent = true;
    energyBandMat.opacityNode = line;
    energyBandMat.colorNode = vec3(line).mul(this.energyColor);

    const displacement = normalLocal.mul(
      sin(uv().y.add(delta.mul(0.5)).mul(10)),
    );
    energyBandMat.positionNode = positionLocal.add(displacement.mul(0.05));

    this.normalizeArcLengths([
      this.spineBones,
      this.armLBones,
      this.armRBones,
      this.legLBones,
      this.legRBones,
    ]);

    if (debugSkeleton && this.bodyMesh) {
      this.skeletonHelper = new SkeletonHelper(this.bodyMesh.skeleton.bones[0]);
    }
  }

  /** Chains must be registered parent-first so arc lengths propagate. */
  registerBoneChain = (
    topBone: Bone,
    filter: (bone: Bone) => boolean = () => true,
  ) => {
    const chain: Bone[] = [];
    if (!topBone) return chain;

    topBone.traverse((object) => {
      const bone = object as Bone;
      const worldPos = bone.getWorldPosition(new Vector3());

      // Arc length from the head, measured along the bind-pose chain.
      const parentArc = this.inheritedValue(bone, "arc");
      const parentPos = bone.parent?.userData.originalPosition as
        | Vector3
        | undefined;
      bone.userData.arc =
        parentPos === undefined
          ? 0
          : parentArc + parentPos.distanceTo(worldPos);
      bone.userData.originalPosition = worldPos;
      bone.userData.bindWorldQuat = bone.getWorldQuaternion(new Quaternion());

      if (!filter(bone)) return;
      bone.userData.bindQuat = bone.quaternion.clone();
      chain.push(bone);
    });

    return chain;
  };

  /** Nearest ancestor value, so chains stay continuous across unfiltered bones. */
  inheritedValue = (bone: Object3D, key: string): number => {
    let parent = bone.parent;
    while (parent) {
      const value = parent.userData[key];
      if (typeof value === "number") return value;
      parent = parent.parent;
    }
    return 0;
  };

  normalizeArcLengths = (chains: Bone[][]) => {
    const bones = chains.flat();
    const total =
      bones.reduce((max, bone) => Math.max(max, bone.userData.arc), 0) || 1;
    bones.forEach((bone) => {
      bone.userData.s = bone.userData.arc / total;
    });
    this.bodyLength = total;
  };

  /** Phase of the travelling wave at normalised arc length `s`, head -> tail. */
  phaseAt = (s: number, lag = 0) =>
    (s / this.swim.waveLength - this.waves - lag) * Math.PI * 2;

  envelopeAt = (s: number) =>
    this.swim.stiffness + (1 - this.swim.stiffness) * s * s;

  /**
   * Absolute bend of the body curve at `s`, in armature space.
   * The body runs along Y, so Z-bend sways in X and X-bend sways in Z; running
   * the second axis a quarter cycle behind turns the flat wave into a helix.
   */
  bendAt = (s: number, lag: number, gain: number, target: Quaternion) => {
    const phase = this.phaseAt(s, lag);
    const amp = this.swim.amplitude * this.envelopeAt(s) * gain;

    this.bendEuler.set(
      -Math.cos(phase) * amp * this.swim.spiral,
      Math.sin(phase) * amp * this.swim.twist,
      Math.sin(phase) * amp,
    );

    return target.setFromEuler(this.bendEuler);
  };

  inheritedBend = (bone: Object3D): Quaternion => {
    let parent = bone.parent;
    while (parent) {
      const bend = parent.userData.absBend as Quaternion | undefined;
      if (bend) return bend;
      parent = parent.parent;
    }
    return IDENTITY;
  };

  /**
   * Each bone stores its absolute bend, so a child only has to apply the
   * difference from its parent's. Conjugating by the parent's bind-pose world
   * rotation moves that difference out of armature space and into the joint's
   * own frame, which is what keeps a multi-axis wave from shearing the chain.
   */
  applySwimWave = (bones: Bone[], { lag = 0, gain = 1 } = {}) => {
    bones.forEach((bone) => {
      const bend = this.bendAt(
        bone.userData.s ?? 0,
        lag,
        gain,
        (bone.userData.absBend as Quaternion) ?? new Quaternion(),
      );
      bone.userData.absBend = bend;

      const delta = this.tmpDelta
        .copy(this.inheritedBend(bone))
        .invert()
        .multiply(bend);

      const frame =
        (bone.parent?.userData.bindWorldQuat as Quaternion) ?? IDENTITY;

      bone.quaternion
        .copy(frame)
        .invert()
        .multiply(delta)
        .multiply(frame)
        .multiply(bone.userData.bindQuat);
    });
  };

  update({ params, deltaTime }: { params: CreatureParams; deltaTime: number }) {
    if (!this.spineBones.length) return;

    this.swim.amplitude = params.swimAmp;
    this.swim.frequency = params.swimFreq;
    this.swim.waveLength = params.swimWaveLength;
    this.swim.stiffness = params.swimStiffness;
    this.swim.twist = params.swimTwist;

    this.energyColor.value.set(...params.pipeSparkColor);

    // Spine and legs are one continuous body; legs read as a forked tail.
    this.applySwimWave(this.spineBones);
    this.applySwimWave(this.legLBones);
    this.applySwimWave(this.legRBones);

    // Arms trail behind the body instead of inheriting its full swing.
    const limb = { lag: params.limbLag, gain: params.limbAmp };
    this.applySwimWave(this.armLBones, limb);
    this.applySwimWave(this.armRBones, limb);

    // The head rides a helix whose angle is locked to the wave phase, so the
    // body's own lateral offset lands it on the path the head already swept.
    const deltaTurns = params.swimTurnSpeed * deltaTime;
    this.turns += deltaTurns;
    this.yPos += params.swimSpeed * deltaTime;
    this.waves += params.swimFreq * deltaTime;
    const angle = this.turns * Math.PI * 2;

    const follow = params.swimPathFollow;

    const radius = follow ? params.swimPathRadius : 0;
    const pitch = params.swimPathPitch;

    this.pathPosition.set(
      Math.cos(angle) * radius,
      this.yPos,
      Math.sin(angle) * radius,
    );

    // The frame is built at angle 0 and the revolution applied separately:
    // slerping an already-revolved frame flips axis once it passes 180 degrees
    // from identity. Radial is local X so the sway stays in the circle's plane.
    this.pathTangent.set(0, pitch, 1).normalize();
    this.pathRadial.set(1, 0, 0);
    this.pathBinormal.crossVectors(this.pathRadial, this.pathTangent);

    this.pathBasis.makeBasis(
      this.pathRadial,
      this.pathTangent,
      this.pathBinormal,
    );

    this.pathQuat
      .setFromRotationMatrix(this.pathBasis)
      .multiply(this.rollQuat.setFromAxisAngle(UP, params.swimPathRoll));

    if (follow) {
      // Carrying this frame's revolution over first leaves the ease with only
      // the toggle gap to close, so it never lags behind a moving target and
      // never unwinds the turns already accumulated.
      const step = -deltaTurns * Math.PI * 2;
      this.renderQuat.premultiply(this.stepQuat.setFromAxisAngle(UP, step));
      this.renderPosition.applyAxisAngle(UP, step);

      this.pathQuat.premultiply(this.yawQuat.setFromAxisAngle(UP, -angle));
    } else {
      this.pathQuat.copy(IDENTITY);
    }

    const ease = 1 - Math.exp(-FOLLOW_SMOOTHING * deltaTime);

    this.renderQuat.slerp(this.pathQuat, ease);
    this.renderPosition.lerp(this.pathPosition, ease);

    this.root.quaternion.copy(this.renderQuat);
    this.root.position.copy(this.renderPosition);
  }

  reset() {
    this.yPos = 0;
    this.turns = 0;
    this.waves = 0;
    this.pathPosition.set(0, 0, 0);
    this.renderPosition.set(0, 0, 0);
    this.renderQuat.copy(IDENTITY);
  }

  dispose() {
    this.skeletonHelper?.dispose();
    this.skeletonHelper = null;
  }
}
