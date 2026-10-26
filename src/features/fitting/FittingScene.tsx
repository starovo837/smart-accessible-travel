import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { aidOptions, filledMeasurements, type FittingDraft } from '../../app/fitting'
import { createFittingModel, disposeModel } from './scene'
import { realisticHuman } from './realisticHuman'

function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
interface Props {draft:FittingDraft;onView:(view:FittingDraft['view'])=>void;onDimensions:()=>void}
export default function FittingScene({draft,onView,onDimensions}:Props){
  const host=useRef<HTMLDivElement>(null),runtime=useRef<{renderer:THREE.WebGLRenderer;scene:THREE.Scene;camera:THREE.PerspectiveCamera;controls:OrbitControls;model?:THREE.Group;render:()=>void}|null>(null),view=useRef(draft.view),onViewRef=useRef(onView)
  view.current=draft.view;onViewRef.current=onView
  const [error,setError]=useState(''),[epoch,setEpoch]=useState(0),[message,setMessage]=useState(''),[ready,setReady]=useState(false),[humanStatus,setHumanStatus]=useState('loading')
  useEffect(()=>{
    const node=host.current;if(!node)return
    let renderer:THREE.WebGLRenderer
    try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false,powerPreference:'low-power'})}catch{setError('这台设备无法启动三维渲染。仍可填写尺寸、比较商品及核验出行；下方提供文字说明。');return}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.setClearColor(0xe9e5dc);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1
    renderer.domElement.setAttribute('aria-label','人体与辅具三维预览。可用下方方向和缩放按钮操作。');renderer.domElement.setAttribute('role','img');node.appendChild(renderer.domElement)
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,30),controls=new OrbitControls(camera,renderer.domElement)
    controls.enableDamping=false;controls.enablePan=false;controls.minDistance=1.3;controls.maxDistance=7;controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI*.88;controls.rotateSpeed=.65;controls.zoomSpeed=.65
    scene.add(new THREE.HemisphereLight(0xfffdf6,0xb5b7a2,2));const light=new THREE.DirectionalLight(0xfff4dd,2.6);light.position.set(-2,4,3);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-2;light.shadow.camera.right=2;light.shadow.camera.top=3;light.shadow.camera.bottom=-2;light.shadow.bias=-.0003;scene.add(light);const fill=new THREE.DirectionalLight(0xf0f5f1,1.1);fill.position.set(3,2,-2);scene.add(fill)
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShadowMaterial({opacity:.14}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor)
    const ground=new THREE.Mesh(new THREE.CircleGeometry(5,72),new THREE.MeshStandardMaterial({color:0xe1ddd2,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;scene.add(ground)
    const render=()=>renderer.render(scene,camera),saveView=()=>onViewRef.current({azimuth:controls.getAzimuthalAngle(),polar:controls.getPolarAngle(),distance:camera.position.distanceTo(controls.target)})
    controls.addEventListener('change',render);controls.addEventListener('end',saveView)
    const resize=()=>{const width=node.clientWidth,height=node.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render()}
    const observer=new ResizeObserver(resize);observer.observe(node)
    const lost=(event:Event)=>{event.preventDefault();setReady(false);setError('三维画面因显存或浏览器状态中断。尺寸草稿仍保留，可点重新加载。')};renderer.domElement.addEventListener('webglcontextlost',lost)
    runtime.current={renderer,scene,camera,controls,render};setError('');setReady(true);resize()
    return()=>{observer.disconnect();controls.removeEventListener('change',render);controls.removeEventListener('end',saveView);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);disposeModel(scene);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();runtime.current=null}
  },[epoch])
  useEffect(()=>{
    const rt=runtime.current;if(!rt)return
    if(rt.model){rt.scene.remove(rt.model);disposeModel(rt.model)}
    const model=createFittingModel(draft);rt.model=model.root;rt.scene.add(model.root);rt.controls.target.copy(model.center);rt.controls.target.y=Math.max(.65,model.center.y)
    let cancelled=false;setHumanStatus('loading')
    realisticHuman(draft,model.anchors,model.seated).then(human=>{if(cancelled||runtime.current!==rt){disposeModel(human);return}model.root.remove(model.placeholder);disposeModel(model.placeholder);model.root.add(human);const bounds=new THREE.Box3().setFromObject(model.root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),distance=rt.camera.position.distanceTo(rt.controls.target),fitDistance=Math.max(size.y,size.x/rt.camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(35/2)))*1.25+size.z*.35;rt.controls.target.copy(center);rt.camera.position.copy(new THREE.Vector3().setFromSpherical(new THREE.Spherical(Math.max(distance,fitDistance),view.current.polar,view.current.azimuth)).add(center));rt.controls.update();setHumanStatus('ready');rt.render()}).catch(()=>{if(!cancelled)setHumanStatus('fallback')})
    const spherical=new THREE.Spherical(view.current.distance,view.current.polar,view.current.azimuth);rt.camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(rt.controls.target));rt.controls.update();rt.render();return()=>{cancelled=true}
  },[draft.body,draft.parameters,draft.aids,draft.pose,draft.side,draft.showDimensions,epoch,ready])
  const changeView=(angle?:number,polar?:number,zoom=1)=>{const rt=runtime.current;if(!rt)return;const r=THREE.MathUtils.clamp(rt.camera.position.distanceTo(rt.controls.target)*zoom,1.3,7),a=angle??rt.controls.getAzimuthalAngle(),p=THREE.MathUtils.clamp(polar??rt.controls.getPolarAngle(),.1,Math.PI*.88);rt.camera.position.copy(new THREE.Vector3().setFromSpherical(new THREE.Spherical(r,p,a)).add(rt.controls.target));rt.controls.update();rt.render();onViewRef.current({azimuth:a,polar:p,distance:r})}
  const exportModel=async()=>{try{const rt=runtime.current;if(!rt?.model)throw Error('三维画面尚未就绪');const buffer=await new GLTFExporter().parseAsync(rt.model,{binary:true});download(new Blob([buffer as ArrayBuffer],{type:'model/gltf-binary'}),'智能无碍行-佩戴示意-不可生产.glb');setMessage('已导出GLB三维示意，可在支持的三维查看器中旋转；不是制造文件。')}catch{setMessage('三维导出未完成。可先导出方案JSON备份。')}}
  const labels=draft.aids.map(id=>aidOptions.find(a=>a.id===id)?.label).join('、')||'未选择辅具'
  return <section className="fit-scene-panel" aria-label="三维佩戴预览">
    <div className="fit-stage" ref={host} data-testid="fitting-canvas" onKeyDown={event=>{const rt=runtime.current;if(!rt)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key)){event.preventDefault();changeView(rt.controls.getAzimuthalAngle()+(event.key==='ArrowLeft'?-.15:event.key==='ArrowRight'?.15:0),rt.controls.getPolarAngle()+(event.key==='ArrowUp'?-.12:event.key==='ArrowDown'?.12:0),['+','='].includes(event.key)?.88:event.key==='-'?1.12:1)}}} tabIndex={0} aria-describedby="fit-scene-instructions">
      <div className="fit-stage-label"><strong>{filledMeasurements(draft.body)?`已填写 ${filledMeasurements(draft.body)} 项尺寸`:'示例比例 · 尚未填写本人尺寸'}</strong><span>{draft.pose==='seated'||draft.pose==='auto'&&draft.aids.includes('wheelchair')?'坐姿':'站姿'} · {labels}</span></div>
      {draft.showDimensions&&<span className="fit-dimension-label">臀宽：{draft.body.hipWidthCm?draft.body.hipWidthCm+'cm（填写）':'38cm（示意）'}</span>}
      {error&&<div className="fit-render-fallback"><strong>三维画面暂不可用</strong><p>{error}</p><button onClick={()=>setEpoch(n=>n+1)}>重新加载三维</button></div>}
      <span className="fit-stage-footnote" data-human-status={humanStatus}>{humanStatus==='loading'?'正在准备自然人物…':humanStatus==='fallback'?'人物加载未完成，暂用基础模型':'通用人物预览 · 不是本人扫描'}</span>
    </div>
    <div className="fit-view-buttons" role="group" aria-label="预设观察角度">{[['正面',0,1.35],['侧面',Math.PI/2,1.35],['背面',Math.PI,1.35],['俯视',0,.15]] .map(([label,a,p])=><button key={label} disabled={!ready} onClick={()=>{changeView(Number(a),Number(p));setMessage('已切换'+label+'视角')}}>{label}</button>)}</div>
    <div className="fit-camera-tools"><button disabled={!ready} aria-label="缩小三维画面" onClick={()=>changeView(undefined,undefined,1.15)}>−</button><p id="fit-scene-instructions">拖动旋转 · 双指缩放<br/><small>键盘方向键转向，＋／−缩放</small></p><button disabled={!ready} aria-label="放大三维画面" onClick={()=>changeView(undefined,undefined,.87)}>＋</button><button disabled={!ready} onClick={()=>{changeView(.65,1.28,3.15/(runtime.current?.camera.position.distanceTo(runtime.current.controls.target)??3.15));setMessage('已复位视角')}}>复位</button></div>
    <details className="fit-scene-details"><summary>画面说明与导出</summary><p>当前组合：{labels}。{filledMeasurements(draft.body)}项来自已填写尺寸，其余采用示例比例。人物有面部、皮肤和衣着，尺寸用于近似调整骨骼比例，不是本人扫描；画面不能验证贴合、压力或医学适用性。</p><label className="switch-line"><input type="checkbox" checked={draft.showDimensions} onChange={onDimensions}/>显示臀宽示意测线</label><div className="fit-inline-actions"><button disabled={!ready||humanStatus==='loading'} onClick={exportModel}>导出三维示意（GLB）</button><button disabled={!ready} onClick={()=>{const rt=runtime.current;if(!rt)return;rt.render();rt.renderer.domElement.toBlob(blob=>{if(blob)download(blob,'智能无碍行-佩戴示意.png')});setMessage('已导出当前三维视角PNG。')}}>保存当前视角图片</button></div></details>
    <p className="sr-only" role="status">{message}</p>
  </section>
}
