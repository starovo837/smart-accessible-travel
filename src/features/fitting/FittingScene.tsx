import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { aidOptions, filledMeasurements, type FittingDraft } from '../../app/fitting';
import { createFittingModel, disposeModel } from './scene';
import { realisticHuman } from './realisticHuman';
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
interface Props {
    draft: FittingDraft;
    onView: (view: FittingDraft['view']) => void;
    onDimensions: () => void;
}
export default function FittingScene({ draft, onView, onDimensions }: Props) {
    const host = useRef<HTMLDivElement>(null), runtime = useRef<{
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        controls: OrbitControls;
        model?: THREE.Group;
        render: () => void;
    } | null>(null), view = useRef(draft.view), onViewRef = useRef(onView);
    view.current = draft.view;
    onViewRef.current = onView;
    const [error, setError] = useState(''), [epoch, setEpoch] = useState(0), [message, setMessage] = useState(''), [ready, setReady] = useState(false), [humanStatus, setHumanStatus] = useState('loading');
    useEffect(() => {
        const node = host.current;
        if (!node)
            return;
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: 'low-power' });
        }
        catch {
            setError(copyDictionary.ce3b166a01ea36b59);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.setClearColor(0xe9e5dc);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.domElement.setAttribute('aria-label', copyDictionary.cdcf30a40aeebed77);
        renderer.domElement.setAttribute('role', 'img');
        node.appendChild(renderer.domElement);
        const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .01, 30), controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.enablePan = false;
        controls.minDistance = 1.3;
        controls.maxDistance = 7;
        controls.minPolarAngle = .1;
        controls.maxPolarAngle = Math.PI * .88;
        controls.rotateSpeed = .65;
        controls.zoomSpeed = .65;
        scene.add(new THREE.HemisphereLight(0xfffdf6, 0xb5b7a2, 2));
        const light = new THREE.DirectionalLight(0xfff4dd, 2.6);
        light.position.set(-2, 4, 3);
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        light.shadow.camera.left = -2;
        light.shadow.camera.right = 2;
        light.shadow.camera.top = 3;
        light.shadow.camera.bottom = -2;
        light.shadow.bias = -.0003;
        scene.add(light);
        const fill = new THREE.DirectionalLight(0xf0f5f1, 1.1);
        fill.position.set(3, 2, -2);
        scene.add(fill);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .14 }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -.02;
        floor.receiveShadow = true;
        scene.add(floor);
        const ground = new THREE.Mesh(new THREE.CircleGeometry(5, 72), new THREE.MeshStandardMaterial({ color: 0xe1ddd2, roughness: 1 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -.025;
        ground.receiveShadow = true;
        scene.add(ground);
        const render = () => renderer.render(scene, camera), saveView = () => onViewRef.current({ azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle(), distance: camera.position.distanceTo(controls.target) });
        controls.addEventListener('change', render);
        controls.addEventListener('end', saveView);
        const resize = () => { const width = node.clientWidth, height = node.clientHeight; if (!width || !height)
            return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); };
        const observer = new ResizeObserver(resize);
        observer.observe(node);
        const lost = (event: Event) => { event.preventDefault(); setReady(false); setError(copyDictionary.cb195fae94cca197a); };
        renderer.domElement.addEventListener('webglcontextlost', lost);
        runtime.current = { renderer, scene, camera, controls, render };
        setError('');
        setReady(true);
        resize();
        return () => { observer.disconnect(); controls.removeEventListener('change', render); controls.removeEventListener('end', saveView); controls.dispose(); renderer.domElement.removeEventListener('webglcontextlost', lost); disposeModel(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); runtime.current = null; };
    }, [epoch]);
    useEffect(() => {
        const rt = runtime.current;
        if (!rt)
            return;
        if (rt.model) {
            rt.scene.remove(rt.model);
            disposeModel(rt.model);
        }
        const model = createFittingModel(draft);
        rt.model = model.root;
        rt.scene.add(model.root);
        rt.controls.target.copy(model.center);
        rt.controls.target.y = Math.max(.65, model.center.y);
        let cancelled = false;
        setHumanStatus('loading');
        realisticHuman(draft, model.anchors, model.seated).then(human => { if (cancelled || runtime.current !== rt) {
            disposeModel(human);
            return;
        } model.root.remove(model.placeholder); disposeModel(model.placeholder); model.root.add(human); const bounds = new THREE.Box3().setFromObject(model.root), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3()), distance = rt.camera.position.distanceTo(rt.controls.target), fitDistance = Math.max(size.y, size.x / rt.camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(35 / 2))) * 1.25 + size.z * .35; rt.controls.target.copy(center); rt.camera.position.copy(new THREE.Vector3().setFromSpherical(new THREE.Spherical(Math.max(distance, fitDistance), view.current.polar, view.current.azimuth)).add(center)); rt.controls.update(); setHumanStatus('ready'); rt.render(); }).catch(() => { if (!cancelled)
            setHumanStatus('fallback'); });
        const spherical = new THREE.Spherical(view.current.distance, view.current.polar, view.current.azimuth);
        rt.camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(rt.controls.target));
        rt.controls.update();
        rt.render();
        return () => { cancelled = true; };
    }, [draft.body, draft.parameters, draft.aids, draft.pose, draft.side, draft.showDimensions, epoch, ready]);
    const changeView = (angle?: number, polar?: number, zoom = 1) => { const rt = runtime.current; if (!rt)
        return; const r = THREE.MathUtils.clamp(rt.camera.position.distanceTo(rt.controls.target) * zoom, 1.3, 7), a = angle ?? rt.controls.getAzimuthalAngle(), p = THREE.MathUtils.clamp(polar ?? rt.controls.getPolarAngle(), .1, Math.PI * .88); rt.camera.position.copy(new THREE.Vector3().setFromSpherical(new THREE.Spherical(r, p, a)).add(rt.controls.target)); rt.controls.update(); rt.render(); onViewRef.current({ azimuth: a, polar: p, distance: r }); };
    const exportModel = async () => { try {
        const rt = runtime.current;
        if (!rt?.model)
            throw Error(copyDictionary.cfcd7b920c4b52abb);
        const buffer = await new GLTFExporter().parseAsync(rt.model, { binary: true });
        download(new Blob([buffer as ArrayBuffer], { type: 'model/gltf-binary' }), copyDictionary.c578b348961374d4f);
        setMessage(copyDictionary.c905e662442cb2d46);
    }
    catch {
        setMessage(copyDictionary.c412eeef62bb976fc);
    } };
    const labels = draft.aids.map(id => aidOptions.find(a => a.id === id)?.label).join('、') || copyDictionary.c98812e50272cd3a2;
    return <section className="fit-scene-panel" aria-label={copyDictionary.c32100a66d6a5f878}>
    <div className="fit-stage" ref={host} data-testid="fitting-canvas" onKeyDown={event => { const rt = runtime.current; if (!rt)
        return; if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(event.key)) {
        event.preventDefault();
        changeView(rt.controls.getAzimuthalAngle() + (event.key === 'ArrowLeft' ? -.15 : event.key === 'ArrowRight' ? .15 : 0), rt.controls.getPolarAngle() + (event.key === 'ArrowUp' ? -.12 : event.key === 'ArrowDown' ? .12 : 0), ['+', '='].includes(event.key) ? .88 : event.key === '-' ? 1.12 : 1);
    } }} tabIndex={0} aria-describedby="fit-scene-instructions">
      <div className="fit-stage-label"><strong>{filledMeasurements(draft.body) ? copyDictionary.c8f3899a2679841a0 + filledMeasurements(draft.body) + copyDictionary.cd28f507c378bda7a : copyDictionary.cd823b8321fd32376}</strong><span>{draft.pose === 'seated' || draft.pose === 'auto' && draft.aids.includes('wheelchair') ? copyDictionary.c9f5a6eca33997fcf : copyDictionary.c2c61b1b954017a17} · {labels}</span></div>
      {draft.showDimensions && <span className="fit-dimension-label">{copyDictionary.ce300d30f3ee35678}{draft.body.hipWidthCm ? draft.body.hipWidthCm + copyDictionary.c9c049b764b7ce8e5 : copyDictionary.c39c2d154f265d62c}</span>}
      {error && <div className="fit-render-fallback"><strong>{copyDictionary.c8b0af74ae57ea3db}</strong><p>{error}</p><button onClick={() => setEpoch(n => n + 1)}>{copyDictionary.ccf06137e9b79ddf2}</button></div>}
      <span className="fit-stage-footnote" data-human-status={humanStatus}>{humanStatus === 'loading' ? copyDictionary.c33fd0f98efe9b386 : humanStatus === 'fallback' ? copyDictionary.cfce6d5c3748be368 : copyDictionary.c2560cc7edddabbd3}</span>
    </div>
    <div className="fit-view-buttons" role="group" aria-label={copyDictionary.c7c41c9531bfcfcba}>{[[copyDictionary.c740f5e8102e08ac4, 0, 1.35], [copyDictionary.c3a8dda67461c4cd7, Math.PI / 2, 1.35], [copyDictionary.c2d270b6ce44abc13, Math.PI, 1.35], [copyDictionary.c6bed5124a74b2db3, 0, .15]].map(([label, a, p]) => <button key={label} disabled={!ready} onClick={() => { changeView(Number(a), Number(p)); setMessage(copyDictionary.c3df4294a9bed4927 + label + copyDictionary.c89c3e9d8bd813948); }}>{label}</button>)}</div>
    <div className="fit-camera-tools"><button disabled={!ready} aria-label={copyDictionary.cbb5a023c87ccf0b6} onClick={() => changeView(undefined, undefined, 1.15)}>−</button><p id="fit-scene-instructions">{copyDictionary.cfaba3bd2ac4526de}<br /><small>{copyDictionary.cb83e3e5ca59b089a}</small></p><button disabled={!ready} aria-label={copyDictionary.c47ad98450ff8191f} onClick={() => changeView(undefined, undefined, .87)}>＋</button><button disabled={!ready} onClick={() => { changeView(.65, 1.28, 3.15 / (runtime.current?.camera.position.distanceTo(runtime.current.controls.target) ?? 3.15)); setMessage(copyDictionary.cbd92b9497cf7e912); }}>{copyDictionary.c95ac0ce3b08bf57c}</button></div>
    <details className="fit-scene-details"><summary>{copyDictionary.c5dfc189fa48e4ab3}</summary><p>{copyDictionary.c1b529dbff6682e00}{labels}。{filledMeasurements(draft.body)}{copyDictionary.c5a0c00f04f5a59a2}</p><label className="switch-line"><input type="checkbox" checked={draft.showDimensions} onChange={onDimensions}/>{copyDictionary.c147f26f7ec288a37}</label><div className="fit-inline-actions"><button disabled={!ready || humanStatus === 'loading'} onClick={exportModel}>{copyDictionary.c74d0dea901273931}</button><button disabled={!ready} onClick={() => { const rt = runtime.current; if (!rt)
        return; rt.render(); rt.renderer.domElement.toBlob(blob => { if (blob)
        download(blob, copyDictionary.cec91e74c8e3fb36c); }); setMessage(copyDictionary.c542f096fccd712fb); }}>{copyDictionary.cbdbe964d9cc2c1f7}</button></div></details>
    <p className="sr-only" role="status">{message}</p>
  </section>;
}
