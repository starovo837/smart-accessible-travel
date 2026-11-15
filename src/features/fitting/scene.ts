import { copyDictionary } from "../../app/copyDictionary.ts";
import * as THREE from 'three';
import { sceneBody, type FittingDraft } from '../../app/fitting.ts';
type Point = [
    number,
    number,
    number
];
export function disposeModel(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    root.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
            materials.add(material);
    } });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
}
export function createFittingModel(draft: FittingDraft) {
    const root = new THREE.Group(), body = sceneBody(draft.body), p = draft.parameters;
    root.name = copyDictionary.c9a34e311d80aabad;
    root.userData = { units: 'metres', purpose: 'visual-concept-only; not a scan, medical fitting or manufacturing file', enteredBodyFields: Object.keys(draft.body).filter(k => draft.body[k as keyof typeof draft.body]), parametersCm: p };
    const skin = new THREE.MeshStandardMaterial({ color: 0xcda78a, roughness: .83 }), joint = new THREE.MeshStandardMaterial({ color: 0xc4a18a, roughness: .9 }), blue = new THREE.MeshStandardMaterial({ color: 0x39564b, roughness: .38, metalness: .48 }), dark = new THREE.MeshStandardMaterial({ color: 0x283831, roughness: .85 }), rubber = new THREE.MeshStandardMaterial({ color: 0x26342e, roughness: 1 }), silver = new THREE.MeshStandardMaterial({ color: 0xaeb6ac, roughness: .4, metalness: .7 }), orange = new THREE.MeshStandardMaterial({ color: 0xb78d4a, roughness: .7 }), red = new THREE.MeshStandardMaterial({ color: 0xd8584a, roughness: .7 }), white = new THREE.MeshStandardMaterial({ color: 0xf6f5e9, roughness: .7 });
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, point: Point, name: string) => { const object = new THREE.Mesh(geometry, material); object.position.set(...point); object.castShadow = true; object.receiveShadow = true; object.name = name; root.add(object); return object; };
    const ball = (point: Point, r: number, material = skin, name = copyDictionary.c630e5531ed0ec1db) => mesh(new THREE.SphereGeometry(r, 20, 16), material, point, name);
    const ellipsoid = (point: Point, size: Point, material = skin, name = copyDictionary.c797b694189cd0502) => { const object = ball(point, 1, material, name); object.scale.set(...size); return object; };
    const box = (point: Point, size: Point, material: THREE.Material, name: string) => mesh(new THREE.BoxGeometry(...size), material, point, name);
    const rod = (from: Point, to: Point, r: number, material = blue, name = copyDictionary.c303615b5ec2b22c5) => { const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), object = mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 12), material, [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], name); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize()); return object; };
    const limb = (a: Point, b: Point, r: number, name: string) => { rod(a, b, r, skin, name); ball(a, r * .96, joint); ball(b, r * .9, joint); };
    const ring = (point: Point, r: number, tube: number, material: THREE.Material, name: string) => mesh(new THREE.TorusGeometry(r, tube, 10, 48), material, point, name);
    const seated = draft.pose === 'seated' || draft.pose === 'auto' && draft.aids.includes('wheelchair'), h = body.heightCm / 100, hip = body.hipWidthCm / 100, shoulder = body.shoulderWidthCm / 100, thigh = body.thighLengthCm / 100, shin = body.lowerLegCm / 100, seatY = p.seatHeight / 100;
    const pelvisY = seated ? seatY + .09 : thigh + shin + .16, bodyZ = seated ? -.05 : draft.aids.includes('wheelchair') ? .46 : 0;
    const torso = Math.max(.20, h - (thigh + shin + .16) - .23), shoulderY = pelvisY + torso, headY = shoulderY + .16;
    ellipsoid([0, pelvisY + .025, bodyZ], [hip * .51, .14, .135], skin, copyDictionary.cb78a7bfad9bf4683);
    // A smooth lathed torso gives the mannequin a readable silhouette.
    const torsoPoints = [new THREE.Vector2(.105, 0), new THREE.Vector2(.135, .10), new THREE.Vector2(.17, torso * .65), new THREE.Vector2(.17, torso * .85), new THREE.Vector2(.075, torso)];
    const trunk = mesh(new THREE.LatheGeometry(torsoPoints, 32), skin, [0, pelvisY + .05, bodyZ], copyDictionary.c7ea355853e5f36cc);
    trunk.scale.x = shoulder / .40;
    rod([0, shoulderY - .01, bodyZ], [0, headY - .07, bodyZ], .05, skin, copyDictionary.c16a569a44d76d9ea);
    ellipsoid([0, headY + .035, bodyZ], [.086, .119, .097], skin, copyDictionary.cae549a2e68a7ed70);
    ellipsoid([0, headY + .018, bodyZ + .096], [.016, .025, .024], skin, copyDictionary.c7f696cdf3122fa02);
    for (const side of [-1, 1]) {
        ellipsoid([side * .087, headY + .025, bodyZ], [.016, .031, .022], joint, copyDictionary.c3a1d55e33c5ec8b9);
        ball([side * .032, headY + .044, bodyZ + .087], .004, dark, copyDictionary.cf35945b44c7ea142);
    }
    const wrists: Point[] = [], elbows: Point[] = [], ankles: Point[] = [], shoulders: Point[] = [], hips: Point[] = [], knees: Point[] = [], footSupports: {
        center: Point;
        size: Point;
    }[] = [];
    for (const side of [-1, 1]) {
        const x = side * hip * .29, hipPoint: Point = [x, pelvisY - .035, bodyZ], knee: Point = seated ? [x, pelvisY - .06, bodyZ + thigh] : [x * .93, pelvisY - thigh, bodyZ + .015];
        // lowerLegCm is measured from the knee crease to the sole, not to the
        // ankle. Share that sole plane with the footrest rather than fixing the
        // footrest at a height unrelated to the seated person's measurements.
        const ankleAboveSole = .071, soleY = Math.max(.055, knee[1] - shin), ankleY = soleY + ankleAboveSole, calfLength = Math.max(.025, shin - ankleAboveSole);
        const ankle: Point = seated ? [x, ankleY, knee[2] + Math.sqrt(Math.max(0, calfLength ** 2 - (knee[1] - ankleY) ** 2))] : [x * .94, .10, bodyZ];
        const legRadius = Math.min(.085, Math.max(.045, hip * .19));
        limb(hipPoint, knee, legRadius, copyDictionary.cc71861762dcaf0bf);
        limb(knee, ankle, legRadius * .67, copyDictionary.ce097251fbf7345a7);
        ankles.push(ankle);
        hips.push(hipPoint);
        knees.push(knee);
        ellipsoid([ankle[0], ankle[1] - ankleAboveSole / 2, ankle[2] + .075], [.047, ankleAboveSole / 2, body.footLengthCm / 200], joint, copyDictionary.cf0da2c5295b80cb3);
        if (seated && draft.aids.includes('wheelchair'))
            footSupports.push({ center: [x, soleY - .0125, ankle[2] + .075], size: [Math.max(.14, body.footLengthCm / 100 * .48), .025, Math.max(.30, body.footLengthCm / 100 + .03)] });
        const armStart: Point = [side * shoulder * .47, shoulderY - .05, bodyZ], wrist: Point = seated ? [side * (hip / 2 + .068), seatY + .235, bodyZ + .26] : [side * (shoulder / 2 + .025), pelvisY + .02, bodyZ + .08];
        const forearm = body.forearmLengthCm / 100, elbow: Point = seated ? [wrist[0], wrist[1] + .025, wrist[2] - forearm] : [side * (shoulder / 2 + .055), wrist[1] + forearm, bodyZ + .035];
        limb(armStart, elbow, .048, copyDictionary.cdc3062b3dd760b3b);
        limb(elbow, wrist, .036, copyDictionary.c3842417fcb3c589e);
        ellipsoid([wrist[0], wrist[1] - .025, wrist[2] + .035], [.036, .058, .026], skin, copyDictionary.c5fb6d5ffe144a7f8);
        wrists.push(wrist);
        elbows.push(elbow);
        shoulders.push(armStart);
    }
    const placeholder = new THREE.Group();
    placeholder.name = copyDictionary.cce7137b6979c6c13;
    for (const child of [...root.children])
        placeholder.add(child);
    root.add(placeholder);
    if (draft.aids.includes('wheelchair')) {
        const w = p.seatWidth / 100, d = p.seatDepth / 100, z = seated ? 0 : -.7, y = seatY;
        box([0, y, z], [w, .065, d], dark, copyDictionary.c0dc8f2c0efc46c0c);
        box([0, y + p.backHeight / 200, z - d / 2], [w * .98, p.backHeight / 100, .055], dark, copyDictionary.cf9a2b5c9d0da733d);
        for (const side of [-1, 1]) {
            const x = side * (w / 2 + .07), wheelX = side * (w / 2 + .115);
            const tire = ring([wheelX, .305, z - .135], .29, .022, rubber, copyDictionary.c2e6a35fd50bf66ba);
            tire.rotation.y = Math.PI / 2;
            const rim = ring([wheelX, .305, z - .135], .255, .009, silver, copyDictionary.cc87409e523ea1232);
            rim.rotation.y = Math.PI / 2;
            const handrim = ring([wheelX + side * .035, .305, z - .135], .255, .008, silver, copyDictionary.c835e33ddf54d2e20);
            handrim.rotation.y = Math.PI / 2;
            for (let i = 0; i < 16; i++) {
                const angle = i * Math.PI / 8;
                rod([wheelX, .305, z - .135], [wheelX, .305 + Math.cos(angle) * .25, z - .135 + Math.sin(angle) * .25], .0025, silver, copyDictionary.c267f0e1a1105031f);
            }
            rod([wheelX - side * .025, .305, z - .135], [wheelX + side * .025, .305, z - .135], .025, blue, copyDictionary.c86c63d57af5f4227);
            rod([x, y - .035, z - d / 2], [x, y - .035, z + d / 2], .017, blue, copyDictionary.c679618769b0101c8);
            rod([x, .30, z - .135], [x, y - .04, z + d / 2], .016, blue, copyDictionary.c5eae711df609a8bd);
            rod([x, y - .03, z - d / 2], [x, y + p.backHeight / 100 + .055, z - d / 2], .017, blue, copyDictionary.c406565c57003304b);
            rod([x, y + p.backHeight / 100 + .055, z - d / 2], [x, y + p.backHeight / 100 + .055, z - d / 2 - .11], .02, dark, copyDictionary.cc78ea73da5546d35);
            rod([x, y - .02, z + d / 2 - .04], [x, y + .22, z + d / 2 - .04], .014, blue, copyDictionary.c9b5657a7cfd3ba9d);
            box([x, y + .235, z + .025], [.065, .035, d * .85], dark, copyDictionary.c6f3e6b30bc72c2cc);
            rod([x, y - .03, z + d / 2], [x, .11, z + d / 2 + .16], .015, blue, copyDictionary.c31ba3f59a23897e4);
            const caster = ring([x, .075, z + d / 2 + .16], .06, .017, rubber, copyDictionary.c5ed4e30ea2304b3c);
            caster.rotation.y = Math.PI / 2;
            const support = footSupports[side === -1 ? 0 : 1] ?? { center: [side * w * .27, .075, z + d / 2 + .32] as Point, size: [w * .43, .025, .16] as Point };
            rod([side * w * .30, y - .04, z + d / 2], [support.center[0], support.center[1] + .0125, support.center[2] - .055], .013, silver, copyDictionary.c38db674aee53bdd6);
            box(support.center, support.size, dark, copyDictionary.c23697d172a944fdc);
        }
        rod([-w / 2 - .06, y - .08, z + .1], [w / 2 + .06, y - .08, z - .17], .013, silver, copyDictionary.cb62fc6503fde2d49);
        rod([w / 2 + .06, y - .08, z + .1], [-w / 2 - .06, y - .08, z - .17], .013, silver, copyDictionary.cb62fc6503fde2d49);
    }
    if (draft.aids.includes('walker')) {
        const top = p.handleHeight / 100, z = bodyZ + .39, w = Math.max(.52, shoulder + .14);
        for (const side of [-1, 1])
            for (const end of [-1, 1]) {
                const x = side * w / 2, zz = z + end * .18;
                rod([x, .04, zz], [x, top - .02, zz], .016, silver, copyDictionary.c24f6ff0ff22c6ca3);
                ball([x, .035, zz], .029, rubber, copyDictionary.ccbd0dac1807643c1);
            }
        for (const side of [-1, 1]) {
            rod([side * w / 2, top, z - .18], [side * w / 2, top, z + .18], .019, blue, copyDictionary.c7fae953f7a1f8994);
            rod([side * w / 2, top + .005, z - .08], [side * w / 2, top + .005, z + .09], .027, dark, copyDictionary.cb2de488a8fa23ecf);
        }
        rod([-w / 2, top * .75, z + .18], [w / 2, top * .75, z + .18], .016, blue, copyDictionary.cc0e6452fc0abf2fd);
    }
    const selectedSides = draft.side === 'both' ? [-1, 1] : [draft.side === 'left' ? 1 : -1];
    for (const side of selectedSides) {
        const index = side === -1 ? 0 : 1, wrist = wrists[index], elbow = elbows[index], ankle = ankles[index];
        if (draft.aids.includes('wrist')) {
            const direction = new THREE.Vector3(...elbow).sub(new THREE.Vector3(...wrist)).normalize(), end = new THREE.Vector3(...wrist).addScaledVector(direction, Math.min(p.supportLength / 100, body.forearmLengthCm / 100) * .8), r = Math.max(.041, body.wristCircCm / 100 / (Math.PI * 2) + .012);
            rod(wrist, end.toArray() as Point, r, orange, copyDictionary.ce2383953814da3b8);
            const cuff = ring(wrist, r + .002, .009, dark, copyDictionary.c11b2dd63b1d8cad5);
            cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
        }
        if (draft.aids.includes('ankle')) {
            const ankleR = body.ankleCircCm / 100 / (Math.PI * 2) + .018;
            ellipsoid([ankle[0], ankle[1] + .045, ankle[2] - .01], [ankleR, .12, ankleR], orange, copyDictionary.ca3890d5241e49348);
            box([ankle[0], ankle[1] - .055, ankle[2] + .06], [ankleR * 2, .026, body.footLengthCm / 100], orange, copyDictionary.c66915b6b12199d96);
            rod([ankle[0] - ankleR, ankle[1] + .06, ankle[2]], [ankle[0] + ankleR, ankle[1] + .06, ankle[2]], .014, dark, copyDictionary.c81d1d078aa514a10);
        }
        if (draft.aids.includes('crutch')) {
            const foot: Point = [wrist[0] + side * .10, .035, wrist[2] + .12];
            rod(foot, [wrist[0], elbow[1] - .03, wrist[2]], .014, silver, copyDictionary.cd7762b62140d9f6b);
            rod([wrist[0] - side * .04, wrist[1], wrist[2]], [wrist[0] + side * .07, wrist[1], wrist[2]], .023, dark, copyDictionary.c916f6887175ba08c);
            ball(foot, .028, rubber, copyDictionary.c0516d600a0268475);
            const cuff = ring([elbow[0], elbow[1] - .02, elbow[2] + .025], .053, .012, blue, copyDictionary.cbef1d6358b0ecc13);
            cuff.rotation.x = Math.PI / 2;
        }
    }
    if (draft.aids.includes('cane')) {
        const wrist = wrists[0], tip: Point = [wrist[0] - .23, .022, wrist[2] + .56], middle: Point = [(wrist[0] + tip[0]) / 2, (wrist[1] + tip[1]) / 2, (wrist[2] + tip[2]) / 2];
        rod(wrist, middle, .010, white, copyDictionary.caa98a03186bc255b);
        rod(middle, tip, .010, red, copyDictionary.c9d16856801b5cdaf);
        ball(tip, .022, white, copyDictionary.cb9cc4351e2d37d0e);
        rod(wrist, [wrist[0], wrist[1] + .09, wrist[2] - .025], .019, dark, copyDictionary.c2be822309e7ed81d);
    }
    if (draft.aids.includes('hearing'))
        for (const side of selectedSides) {
            const aid = ring([side * .102, headY + .035, bodyZ - .006], .031, .010, orange, copyDictionary.cd6a42dca84b59eda);
            aid.rotation.y = Math.PI / 2;
            ellipsoid([side * .111, headY + .014, bodyZ - .027], [.013, .028, .013], orange, copyDictionary.cae347311682e3c9c);
        }
    if (draft.showDimensions) {
        const points = [new THREE.Vector3(-hip / 2, pelvisY + .16, bodyZ + .2), new THREE.Vector3(hip / 2, pelvisY + .16, bodyZ + .2)], line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x167d73 }));
        root.add(line);
        for (const side of [-1, 1])
            rod([side * hip / 2, pelvisY + .14, bodyZ + .2], [side * hip / 2, pelvisY + .18, bodyZ + .2], .003, blue, copyDictionary.c58cda373764ae00c);
    }
    const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    return { root, center, size, seated, body, placeholder, anchors: { pelvis: [0, pelvisY, bodyZ] as Point, head: [0, headY - .07, bodyZ] as Point, shoulders, elbows, wrists, hips, knees, ankles, footSupports } };
}
