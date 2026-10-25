import * as THREE from 'three'
import { sceneBody, type FittingDraft } from '../../app/fitting.ts'

type Point = [number,number,number]
export function disposeModel(root:THREE.Object3D){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>()
  root.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.LineSegments||object instanceof THREE.Line){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material)}})
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())
}

export function createFittingModel(draft:FittingDraft){
  const root=new THREE.Group(),body=sceneBody(draft.body),p=draft.parameters
  root.name='智能无碍行-人体与辅具示意';root.userData={units:'metres',purpose:'visual-concept-only; not a scan, medical fitting or manufacturing file',enteredBodyFields:Object.keys(draft.body).filter(k=>draft.body[k as keyof typeof draft.body]),parametersCm:p}
  const skin=new THREE.MeshStandardMaterial({color:0xd9dee1,roughness:.83}),joint=new THREE.MeshStandardMaterial({color:0xc8d0d6,roughness:.9}),blue=new THREE.MeshStandardMaterial({color:0x19618a,roughness:.38,metalness:.48}),dark=new THREE.MeshStandardMaterial({color:0x283b49,roughness:.85}),rubber=new THREE.MeshStandardMaterial({color:0x26343e,roughness:1}),silver=new THREE.MeshStandardMaterial({color:0xa6b6bf,roughness:.4,metalness:.7}),orange=new THREE.MeshStandardMaterial({color:0xdf963b,roughness:.7}),red=new THREE.MeshStandardMaterial({color:0xd8584a,roughness:.7}),white=new THREE.MeshStandardMaterial({color:0xf6f5e9,roughness:.7})
  const mesh=(geometry:THREE.BufferGeometry,material:THREE.Material,point:Point,name:string)=>{const object=new THREE.Mesh(geometry,material);object.position.set(...point);object.castShadow=true;object.receiveShadow=true;object.name=name;root.add(object);return object}
  const ball=(point:Point,r:number,material=skin,name='关节')=>mesh(new THREE.SphereGeometry(r,20,16),material,point,name)
  const ellipsoid=(point:Point,size:Point,material=skin,name='人体')=>{const object=ball(point,1,material,name);object.scale.set(...size);return object}
  const box=(point:Point,size:Point,material:THREE.Material,name:string)=>mesh(new THREE.BoxGeometry(...size),material,point,name)
  const rod=(from:Point,to:Point,r:number,material=blue,name='支架')=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),object=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),12),material,[(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2],name);object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return object}
  const limb=(a:Point,b:Point,r:number,name:string)=>{rod(a,b,r,skin,name);ball(a,r*.96,joint);ball(b,r*.9,joint)}
  const ring=(point:Point,r:number,tube:number,material:THREE.Material,name:string)=>mesh(new THREE.TorusGeometry(r,tube,10,48),material,point,name)
  const seated=draft.pose==='seated'||draft.pose==='auto'&&draft.aids.includes('wheelchair'),h=body.heightCm/100,hip=body.hipWidthCm/100,shoulder=body.shoulderWidthCm/100,thigh=body.thighLengthCm/100,shin=body.lowerLegCm/100,seatY=p.seatHeight/100
  const pelvisY=seated?seatY+.09:thigh+shin+.16,bodyZ=seated?-.05: draft.aids.includes('wheelchair')?.46:0
  const torso=Math.max(.20,h-(thigh+shin+.16)-.314),shoulderY=pelvisY+torso,headY=shoulderY+.16
  ellipsoid([0,pelvisY+.025,bodyZ],[hip*.51,.14,.135],skin,'骨盆示意')
  // A smooth lathed torso gives the mannequin a readable silhouette.
  const torsoPoints=[new THREE.Vector2(.105,0),new THREE.Vector2(.135,.10),new THREE.Vector2(.17,torso*.65),new THREE.Vector2(.17,torso*.85),new THREE.Vector2(.075,torso)]
  const trunk=mesh(new THREE.LatheGeometry(torsoPoints,32),skin,[0,pelvisY+.05,bodyZ],'躯干示意');trunk.scale.x=shoulder/.40
  rod([0,shoulderY-.01,bodyZ],[0,headY-.07,bodyZ],.05,skin,'颈部')
  ellipsoid([0,headY+.035,bodyZ],[.086,.119,.097],skin,'头部')
  ellipsoid([0,headY+.018,bodyZ+.096],[.016,.025,.024],skin,'鼻部朝向')
  for(const side of [-1,1]){ellipsoid([side*.087,headY+.025,bodyZ],[.016,.031,.022],joint,'耳部');ball([side*.032,headY+.044,bodyZ+.087],.004,dark,'朝向标记')}
  const wrists:Point[]=[],elbows:Point[]=[],ankles:Point[]=[]
  for(const side of [-1,1]){
    const x=side*hip*.29,hipPoint:Point=[x,pelvisY-.035,bodyZ],knee:Point=seated?[x,pelvisY-.06,bodyZ+thigh]:[x*.93,pelvisY-thigh,bodyZ+.015],ankle:Point=seated?[x,pelvisY-.06-shin,bodyZ+thigh+.015]:[x*.94,.10,bodyZ]
    const legRadius=Math.min(.085,Math.max(.045,hip*.19));limb(hipPoint,knee,legRadius,'大腿');limb(knee,ankle,legRadius*.67,'小腿');ankles.push(ankle)
    ellipsoid([ankle[0],ankle[1]-.04,ankle[2]+.075],[.047,.047,body.footLengthCm/200],joint,'足部')
    const armStart:Point=[side*shoulder*.47,shoulderY-.05,bodyZ],wrist:Point=seated?[side*(hip/2+.068),seatY+.235,bodyZ+.26]:[side*(shoulder/2+.025),pelvisY+.02,bodyZ+.08]
    const forearm=body.forearmLengthCm/100,elbow:Point=seated?[wrist[0],wrist[1]+.025,wrist[2]-forearm]:[side*(shoulder/2+.055),wrist[1]+forearm,bodyZ+.035]
    limb(armStart,elbow,.048,'上臂');limb(elbow,wrist,.036,'前臂');ellipsoid([wrist[0],wrist[1]-.025,wrist[2]+.035],[.036,.058,.026],skin,'手部');wrists.push(wrist);elbows.push(elbow)
  }
  if(draft.aids.includes('wheelchair')){
    const w=p.seatWidth/100,d=p.seatDepth/100,z=seated?0:-.7,y=seatY
    box([0,y,z],[w,.065,d],dark,'可调示意座面');box([0,y+p.backHeight/200,z-d/2],[w*.98,p.backHeight/100,.055],dark,'可调靠背')
    for(const side of [-1,1]){
      const x=side*(w/2+.07),wheelX=side*(w/2+.115)
      const tire=ring([wheelX,.305,z-.135],.29,.022,rubber,'后轮轮胎');tire.rotation.y=Math.PI/2
      const rim=ring([wheelX,.305,z-.135],.255,.009,silver,'轮圈');rim.rotation.y=Math.PI/2
      const handrim=ring([wheelX+side*.035,.305,z-.135],.255,.008,silver,'手推圈');handrim.rotation.y=Math.PI/2
      for(let i=0;i<16;i++){const angle=i*Math.PI/8;rod([wheelX,.305,z-.135],[wheelX,.305+Math.cos(angle)*.25,z-.135+Math.sin(angle)*.25],.0025,silver,'轮辐')}
      rod([wheelX-side*.025,.305,z-.135],[wheelX+side*.025,.305,z-.135],.025,blue,'轮轴')
      rod([x,y-.035,z-d/2],[x,y-.035,z+d/2],.017,blue,'侧框');rod([x,.30,z-.135],[x,y-.04,z+d/2],.016,blue,'承架示意')
      rod([x,y-.03,z-d/2],[x,y+p.backHeight/100+.055,z-d/2],.017,blue,'靠背支架');rod([x,y+p.backHeight/100+.055,z-d/2],[x,y+p.backHeight/100+.055,z-d/2-.11],.02,dark,'推把')
      rod([x,y-.02,z+d/2-.04],[x,y+.22,z+d/2-.04],.014,blue,'扶手支架');box([x,y+.235,z+.025],[.065,.035,d*.85],dark,'扶手')
      rod([x,y-.03,z+d/2],[x,.11,z+d/2+.16],.015,blue,'前架');const caster=ring([x,.075,z+d/2+.16],.06,.017,rubber,'前脚轮');caster.rotation.y=Math.PI/2
      rod([side*w*.30,y-.04,z+d/2],[side*w*.30,.09,z+d/2+.27],.013,silver,'足踏支架');box([side*w*.27,.075,z+d/2+.32],[w*.43,.025,.16],dark,'足踏板')
    }
    rod([-w/2-.06,y-.08,z+.1],[w/2+.06,y-.08,z-.17],.013,silver,'交叉架');rod([w/2+.06,y-.08,z+.1],[-w/2-.06,y-.08,z-.17],.013,silver,'交叉架')
  }
  if(draft.aids.includes('walker')){
    const top=p.handleHeight/100,z=bodyZ+.39,w=Math.max(.52,shoulder+.14)
    for(const side of [-1,1])for(const end of [-1,1]){const x=side*w/2,zz=z+end*.18;rod([x,.04,zz],[x,top-.02,zz],.016,silver,'助行架腿');ball([x,.035,zz],.029,rubber,'防滑脚套')}
    for(const side of [-1,1]){rod([side*w/2,top,z-.18],[side*w/2,top,z+.18],.019,blue,'握把支架');rod([side*w/2,top+.005,z-.08],[side*w/2,top+.005,z+.09],.027,dark,'助行握把')}
    rod([-w/2,top*.75,z+.18],[w/2,top*.75,z+.18],.016,blue,'助行架前横梁')
  }
  const selectedSides=draft.side==='both'?[-1,1]:[draft.side==='left'?1:-1]
  for(const side of selectedSides){const index=side===-1?0:1,wrist=wrists[index],elbow=elbows[index],ankle=ankles[index]
    if(draft.aids.includes('wrist')){const direction=new THREE.Vector3(...elbow).sub(new THREE.Vector3(...wrist)).normalize(),end=new THREE.Vector3(...wrist).addScaledVector(direction,Math.min(p.supportLength/100,body.forearmLengthCm/100)*.8),r=Math.max(.041,body.wristCircCm/100/(Math.PI*2)+.012);rod(wrist,end.toArray() as Point,r,orange,'腕部支撑示意');const cuff=ring(wrist,r+.002,.009,dark,'腕托绑带');cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction)}
    if(draft.aids.includes('ankle')){const ankleR=body.ankleCircCm/100/(Math.PI*2)+.018;ellipsoid([ankle[0],ankle[1]+.045,ankle[2]-.01],[ankleR,.12,ankleR],orange,'踝部支撑示意');box([ankle[0],ankle[1]-.055,ankle[2]+.06],[ankleR*2,.026,body.footLengthCm/100],orange,'足底支撑示意');rod([ankle[0]-ankleR,ankle[1]+.06,ankle[2]],[ankle[0]+ankleR,ankle[1]+.06,ankle[2]],.014,dark,'踝部绑带')}
    if(draft.aids.includes('crutch')){const foot:Point=[wrist[0]+side*.10,.035,wrist[2]+.12];rod(foot,[wrist[0],elbow[1]-.03,wrist[2]],.014,silver,'前臂拐杖');rod([wrist[0]-side*.04,wrist[1],wrist[2]],[wrist[0]+side*.07,wrist[1],wrist[2]],.023,dark,'拐杖握把');ball(foot,.028,rubber,'拐杖脚套');const cuff=ring([elbow[0],elbow[1]-.02,elbow[2]+.025],.053,.012,blue,'前臂环');cuff.rotation.x=Math.PI/2}
  }
  if(draft.aids.includes('cane')){const wrist=wrists[0],tip:Point=[wrist[0]-.23,.022,wrist[2]+.56],middle:Point=[(wrist[0]+tip[0])/2,(wrist[1]+tip[1])/2,(wrist[2]+tip[2])/2];rod(wrist,middle,.010,white,'盲杖上段');rod(middle,tip,.010,red,'盲杖下段');ball(tip,.022,white,'盲杖触头');rod(wrist,[wrist[0],wrist[1]+.09,wrist[2]-.025],.019,dark,'盲杖握柄')}
  if(draft.aids.includes('hearing'))for(const side of selectedSides){const aid=ring([side*.102,headY+.035,bodyZ-.006],.031,.010,orange,'耳背式助听器示意');aid.rotation.y=Math.PI/2;ellipsoid([side*.111,headY+.014,bodyZ-.027],[.013,.028,.013],orange,'助听器机身')}
  if(draft.showDimensions){const points=[new THREE.Vector3(-hip/2,pelvisY+.16,bodyZ+.2),new THREE.Vector3(hip/2,pelvisY+.16,bodyZ+.2)],line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x167d73}));root.add(line);for(const side of [-1,1])rod([side*hip/2,pelvisY+.14,bodyZ+.2],[side*hip/2,pelvisY+.18,bodyZ+.2],.003,blue,'臀宽示意测线')}
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3())
  return {root,center,size,seated,body}
}
