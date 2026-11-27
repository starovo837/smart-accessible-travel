import { copyDictionary } from "../../app/copyDictionary.ts";
import { assetUrl } from '../../app/assetUrl.ts';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { bodyAppearance, type FittingDraft } from '../../app/fitting.ts';
let source: Promise<{
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
}> | undefined;
export function loadHuman() {
    source ??= new GLTFLoader().loadAsync(assetUrl('models/person.glb')).catch(error => { source = undefined; throw error; });
    return source;
}
type Point = [
    number,
    number,
    number
];
export interface HumanAnchors {
    pelvis: Point;
    head: Point;
    shoulders: Point[];
    elbows: Point[];
    wrists: Point[];
    hips: Point[];
    knees: Point[];
    ankles: Point[];
    footSupports?: {
        center: Point;
        size: Point;
    }[];
}
// Pose a generic, licensed rig. Measurements guide proportions; no body scan or
// inferred medical data is produced. Bake the skin so ordinary GLB export works.
export async function realisticHuman(draft: FittingDraft, anchors: HumanAnchors, seated: boolean, onDiagnostics?: (legs: LegDiagnostics[]) => void) {
    return poseRealisticHuman(await loadHuman(), draft, anchors, seated, onDiagnostics);
}

const legSides = ['r', 'l'] as const;
export type LegDiagnostics = {
    side: typeof legSides[number];
    kneeDegrees: number;
    calfFromVerticalDegrees: number;
    calfSkinAxisErrorDegrees: number;
    soleTiltDegrees: number | null;
    lowestSoleY: number | null;
    supportY: number | null;
};

function shoeVertices(mesh: THREE.SkinnedMesh) {
    const indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
    const right: number[] = [], left: number[] = [];
    for (let i = 0; i < weights.count; i++) {
        let r = 0, l = 0;
        for (let j = 0; j < 4; j++) {
            const name = mesh.skeleton.bones[indices.getComponent(i, j)]?.name;
            if (name === 'foot_r' || name === 'ball_r') r += weights.getComponent(i, j);
            if (name === 'foot_l' || name === 'ball_l') l += weights.getComponent(i, j);
        }
        if (r >= .7) right.push(i);
        if (l >= .7) left.push(i);
    }
    return [right, left];
}

function measureSole(mesh: THREE.SkinnedMesh, indices: number[]) {
    if (!indices.length) return;
    mesh.skeleton.update();
    const position = mesh.geometry.getAttribute('position');
    const points = indices.map(i => mesh.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(position, i)).applyMatrix4(mesh.matrixWorld));
    const lowestY = points.reduce((lowest, point) => Math.min(lowest, point.y), Infinity);
    // The binding orientation is already near level. Fit the contact band,
    // excluding the uppers and the raised tread around the sides of the shoe.
    const contact = points.filter(point => point.y <= lowestY + .005);
    const center = contact.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(contact.length);
    let xx = 0, zz = 0, xz = 0, xy = 0, zy = 0;
    for (const point of contact) {
        const x = point.x - center.x, y = point.y - center.y, z = point.z - center.z;
        xx += x * x;
        zz += z * z;
        xz += x * z;
        xy += x * y;
        zy += z * y;
    }
    const determinant = xx * zz - xz * xz;
    const normal = determinant > 1e-12
        ? new THREE.Vector3((xz * zy - zz * xy) / determinant, 1, (xz * xy - xx * zy) / determinant).normalize()
        : undefined;
    return { lowestY, normal };
}

export function poseRealisticHuman(asset: {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
}, draft: FittingDraft, anchors: HumanAnchors, seated: boolean, onDiagnostics?: (legs: LegDiagnostics[]) => void) {
    const rig = clone(asset.scene);
    rig.updateMatrixWorld(true);
    const bone = (name: string) => rig.getObjectByName(name) as THREE.Bone | undefined;
    const pelvis = bone('pelvis');
    if (!pelvis)
        throw Error(copyDictionary.c90650653886d16b4);
    const binding = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>();
    rig.traverse(node => {
        if (node instanceof THREE.Bone) binding.set(node.name, { position: node.position.clone(), rotation: node.quaternion.clone() });
    });
    const feet = legSides.map(side => bone('foot_' + side)!.getWorldQuaternion(new THREE.Quaternion()));
    // The GLB parents each foot outside the leg chain. Cache the direction
    // in calf space before moving either joint so the skin follows the aim.
    const calfDirections = legSides.map(side => {
        const calf = bone('calf_' + side)!, foot = bone('foot_' + side)!;
        return calf.worldToLocal(foot.getWorldPosition(new THREE.Vector3()));
    });
    const mixer = seated && asset.animations[0] ? new THREE.AnimationMixer(rig) : undefined;
    if (mixer) {
        mixer.clipAction(asset.animations[0]).play();
        mixer.setTime(3);
        rig.updateMatrixWorld(true);
    }
    // Fit the world-space rig to the same anchors used by assistive geometry.
    const move = (name: string, target: Point) => { const node = bone(name); if (!node?.parent)
        return; node.position.copy(node.parent.worldToLocal(new THREE.Vector3(...target))); rig.updateMatrixWorld(true); };
    const setWorldRotation = (node: THREE.Bone, rotation: THREE.Quaternion) => {
        node.quaternion.copy(node.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
    };
    const aim = (name: string, childName: string, target: Point, localDirection?: THREE.Vector3) => {
        const node = bone(name), child = bone(childName);
        if (!node?.parent || !child) return;
        const start = node.getWorldPosition(new THREE.Vector3());
        const end = localDirection ? node.localToWorld(localDirection.clone()) : child.getWorldPosition(new THREE.Vector3());
        const from = end.sub(start).normalize(), to = new THREE.Vector3(...target).sub(start).normalize();
        const rotation = new THREE.Quaternion().setFromUnitVectors(from, to).multiply(node.getWorldQuaternion(new THREE.Quaternion()));
        setWorldRotation(node, rotation);
        rig.updateMatrixWorld(true);
    };
    const originalPelvis = pelvis.getWorldPosition(new THREE.Vector3()), originalShoulder = bone('upperarm_r')!.getWorldPosition(new THREE.Vector3());
    const desiredShoulder = new THREE.Vector3(...anchors.shoulders[0]), torsoScale = (desiredShoulder.y - anchors.pelvis[1]) / (originalShoulder.y - originalPelvis.y);
    const torsoBones = ['spine_01', 'spine_02', 'spine_03', 'clavicle_r', 'clavicle_l', 'neck_01', 'head'];
    const torsoTargets = torsoBones.map(name => { const point = bone(name)!.getWorldPosition(new THREE.Vector3()).sub(originalPelvis); point.y *= torsoScale; point.x *= Math.abs(anchors.shoulders[0][0] / originalShoulder.x); point.add(new THREE.Vector3(...anchors.pelvis)); return { name, point }; });
    move('pelvis', anchors.pelvis);
    for (const { name, point } of torsoTargets)
        move(name, point.toArray() as Point);
    for (const [index, side] of legSides.entries()) {
        if (!seated) {
            for (const joint of ['thigh', 'calf', 'foot', 'ball']) {
                const node = bone(joint + '_' + side), rest = binding.get(joint + '_' + side);
                if (node && rest) {
                    node.position.copy(rest.position);
                    node.quaternion.copy(rest.rotation);
                }
            }
        }
        move('thigh_' + side, anchors.hips[index]);
        aim('thigh_' + side, 'calf_' + side, anchors.knees[index]);
        move('calf_' + side, anchors.knees[index]);
        aim('calf_' + side, 'foot_' + side, anchors.ankles[index], calfDirections[index]);
        move('foot_' + side, anchors.ankles[index]);
        move('upperarm_' + side, anchors.shoulders[index]);
        aim('upperarm_' + side, 'lowerarm_' + side, anchors.elbows[index]);
        move('lowerarm_' + side, anchors.elbows[index]);
        aim('lowerarm_' + side, 'hand_' + side, anchors.wrists[index]);
        move('hand_' + side, anchors.wrists[index]);
    }
    for (const [index, side] of legSides.entries()) {
        setWorldRotation(bone('foot_' + side)!, feet[index]);
        const toe = bone('ball_' + side), rest = binding.get('ball_' + side);
        if (toe && rest) {
            toe.position.copy(rest.position);
            toe.quaternion.copy(rest.rotation);
        }
    }
    rig.updateMatrixWorld(true);
    const shoe = rig.getObjectByName('shoes01');
    const diagnostics: LegDiagnostics[] = [];
    if (shoe instanceof THREE.SkinnedMesh) {
        const soleIndices = shoeVertices(shoe), up = new THREE.Vector3(0, 1, 0);
        for (const [index, side] of legSides.entries()) {
            const foot = bone('foot_' + side)!;
            const support = anchors.footSupports?.[index];
            const supportY = seated ? support ? support.center[1] + support.size[1] / 2 : null : 0;
            let sole = measureSole(shoe, soleIndices[index]);
            if (sole?.normal) {
                const correction = new THREE.Quaternion().setFromUnitVectors(sole.normal, up);
                setWorldRotation(foot, correction.multiply(foot.getWorldQuaternion(new THREE.Quaternion())));
                rig.updateMatrixWorld(true);
                sole = measureSole(shoe, soleIndices[index]);
            }
            if (sole && supportY !== null) {
                const target = foot.getWorldPosition(new THREE.Vector3());
                target.y += supportY - sole.lowestY;
                move(foot.name, target.toArray() as Point);
            }
            if (onDiagnostics) {
                const hip = bone('thigh_' + side)!.getWorldPosition(new THREE.Vector3());
                const calfBone = bone('calf_' + side)!;
                const knee = calfBone.getWorldPosition(new THREE.Vector3());
                const calf = foot.getWorldPosition(new THREE.Vector3()).sub(knee);
                const skinDirection = calfBone.localToWorld(calfDirections[index].clone()).sub(knee);
                const thigh = knee.sub(hip);
                sole = measureSole(shoe, soleIndices[index]);
                diagnostics.push({
                    side, kneeDegrees: THREE.MathUtils.radToDeg(thigh.angleTo(calf)),
                    calfSkinAxisErrorDegrees: THREE.MathUtils.radToDeg(skinDirection.angleTo(calf)),
                    calfFromVerticalDegrees: THREE.MathUtils.radToDeg(up.angleTo(calf.negate())),
                    soleTiltDegrees: sole?.normal ? THREE.MathUtils.radToDeg(sole.normal.angleTo(up)) : null,
                    lowestSoleY: sole?.lowestY ?? null, supportY,
                });
            }
        }
    }
    onDiagnostics?.(diagnostics);
    const result = new THREE.Group(), appearance = bodyAppearance(draft.body);
    result.name = copyDictionary.c5853b87ab11bee07;
    const shape = (vertex: THREE.Vector3, name: string) => {
        if (!appearance.approximate)
            return;
        const amount = appearance.volume - 1, torsoHeight = Math.max(.2, anchors.shoulders[0][1] - anchors.pelvis[1]);
        if (/^(pelvis|spine_)/.test(name)) {
            const t = THREE.MathUtils.clamp((vertex.y - anchors.pelvis[1]) / torsoHeight, 0, 1), waist = Math.sin(t * Math.PI);
            const lateral = appearance.hipMeasured ? waist * .65 : .45 + waist * .3;
            vertex.x *= 1 + amount * lateral * (appearance.shoulderMeasured ? 1 - t * .4 : 1);
            vertex.z = anchors.pelvis[2] + (vertex.z - anchors.pelvis[2]) * (1 + amount * (.7 + waist * .5));
        }
        else if (/^(upperarm|lowerarm|thigh|calf)_/.test(name)) {
            const index = name.endsWith('_r') ? 0 : 1, upper = name.startsWith('upperarm'), lower = name.startsWith('lowerarm'), thigh = name.startsWith('thigh');
            const a = new THREE.Vector3(...(upper ? anchors.shoulders[index] : lower ? anchors.elbows[index] : thigh ? anchors.hips[index] : anchors.knees[index])), b = new THREE.Vector3(...(upper ? anchors.elbows[index] : lower ? anchors.wrists[index] : thigh ? anchors.knees[index] : anchors.ankles[index])), axis = b.sub(a), t = THREE.MathUtils.clamp(vertex.clone().sub(a).dot(axis) / axis.lengthSq(), 0, 1), center = a.addScaledVector(axis, t), protectedEnd = lower && appearance.wristMeasured || name.startsWith('calf') && appearance.ankleMeasured;
            vertex.sub(center).multiplyScalar(1 + amount * .38 * (protectedEnd ? 1 - t : 1)).add(center);
        }
    };
    rig.traverse(object => {
        if (!(object instanceof THREE.SkinnedMesh) || object.name.toLowerCase().includes('accessory'))
            return;
        object.skeleton.update();
        const geometry = object.geometry.clone(), positions = geometry.getAttribute('position'), indices = geometry.getAttribute('skinIndex'), weights = geometry.getAttribute('skinWeight'), vertex = new THREE.Vector3();
        const shaped = new THREE.Vector3(), blended = new THREE.Vector3();
        for (let i = 0; i < positions.count; i++) {
            vertex.fromBufferAttribute(positions, i);
            object.applyBoneTransform(i, vertex);
            vertex.applyMatrix4(object.matrixWorld);
            if (appearance.approximate && indices && weights) {
                blended.set(0, 0, 0);
                let total = 0;
                for (let j = 0; j < 4; j++) {
                    const weight = weights.getComponent(i, j);
                    if (weight <= 0)
                        continue;
                    shaped.copy(vertex);
                    shape(shaped, object.skeleton.bones[indices.getComponent(i, j)]?.name ?? '');
                    blended.addScaledVector(shaped, weight);
                    total += weight;
                }
                if (total > 0)
                    vertex.copy(blended.divideScalar(total));
            }
            positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        geometry.deleteAttribute('skinIndex');
        geometry.deleteAttribute('skinWeight');
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(material => material.clone());
        const mesh = new THREE.Mesh(geometry, Array.isArray(object.material) ? materials : materials[0]);
        mesh.name = copyDictionary.ccf622c931cff72a0 + object.name;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        result.add(mesh);
    });
    mixer?.stopAllAction();
    mixer?.uncacheRoot(rig);
    result.userData = { source: assetUrl('models/person-license.json'), genericHuman: true, clinicalFitVerified: false, weightAppearance: appearance.approximate ? 'approximate visual volume only' : 'reference volume', measuredBodyDimensionsUnchanged: true };
    return result;
}
