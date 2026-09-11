import {
  Bone,
  Euler,
  Group,
  Object3D,
  Quaternion,
  SkeletonHelper,
  SkinnedMesh,
  Vector3,
} from "three/webgpu";

const IDENTITY = new Quaternion();
const UP = new Vector3(0, 1, 0);

export interface CreatureParams {
  swimAmp: number;
  swimFreq: number;
  swimWaveLength: number;
  swimStiffness: number;
  swimSpiral: number;
  swimTwist: number;
  limbAmp: number;
  limbLag: number;
  swimPathRadius: number;
  swimPathPitch: number;
  swimPathAlign: number;
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

  spineBones: Bone[] = [];
  armLBones: Bone[] = [];
  armRBones: Bone[] = [];
  legLBones: Bone[] = [];
  legRBones: Bone[] = [];

  time = 0;
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
  private pathQuat = new Quaternion();

  constructor(model: Object3D, { debugSkeleton = false } = {}) {
    this.model = model;
    this.root.add(model);

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

      // Arc length from the head, measured along the rest-pose chain.
      const parentArc = this.inheritedValue(bone, "arc");
      const parentPos = bone.parent?.userData.restPoseWorldPos as
        | Vector3
        | undefined;
      bone.userData.arc =
        parentPos === undefined
          ? 0
          : parentArc + parentPos.distanceTo(worldPos);
      bone.userData.restPoseWorldPos = worldPos;
      bone.userData.restPoseWorldQuat = bone.getWorldQuaternion(
        new Quaternion(),
      );

      if (!filter(bone)) return;
      bone.userData.restPoseQuat = bone.quaternion.clone();
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
    (s / this.swim.waveLength - this.time * this.swim.frequency - lag) *
    Math.PI *
    2;

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
   * difference from its parent's. Conjugating by the parent's rest-pose world
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
        (bone.parent?.userData.restPoseWorldQuat as Quaternion) ?? IDENTITY;

      bone.quaternion
        .copy(frame)
        .invert()
        .multiply(delta)
        .multiply(frame)
        .multiply(bone.userData.restPoseQuat);
    });
  };

  update({ params, deltaTime }: { params: CreatureParams; deltaTime: number }) {
    if (!this.spineBones.length) return;

    this.time += deltaTime;

    this.swim.amplitude = params.swimAmp;
    this.swim.frequency = params.swimFreq;
    this.swim.waveLength = params.swimWaveLength;
    this.swim.stiffness = params.swimStiffness;
    this.swim.spiral = params.swimSpiral;
    this.swim.twist = params.swimTwist;

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
    const turns = this.time * this.swim.frequency;
    const angle = turns * Math.PI * 2;

    const radius =
      ((this.swim.amplitude * this.swim.waveLength) / (Math.PI * 2)) *
      this.bodyLength *
      params.swimPathRadius;
    const pitch = params.swimPathPitch;

    this.root.position.set(
      Math.cos(angle) * radius,
      angle * radius * pitch,
      Math.sin(angle) * radius * this.swim.spiral,
    );

    this.pathTangent
      .set(-Math.sin(angle), pitch, Math.cos(angle) * this.swim.spiral)
      .normalize();

    this.pathQuat.setFromUnitVectors(UP, this.pathTangent);
    this.root.quaternion
      .copy(IDENTITY)
      .slerp(this.pathQuat, params.swimPathAlign);
  }

  dispose() {
    this.skeletonHelper?.dispose();
    this.skeletonHelper = null;
  }
}
