import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import {bodyAppearance,type FittingDraft} from '../../app/fitting'

let source: Promise<{scene:THREE.Group;animations:THREE.AnimationClip[]}>|undefined
export function loadHuman(){
  source??=new GLTFLoader().loadAsync('/models/person.glb').catch(error=>{source=undefined;throw error})
  return source
}

type Point=[number,number,number]
export interface HumanAnchors {pelvis:Point;head:Point;shoulders:Point[];elbows:Point[];wrists:Point[];hips:Point[];knees:Point[];ankles:Point[]}

// Pose a generic, licensed rig. Measurements guide proportions; no body scan or
// inferred medical data is produced. Bake the skin so ordinary GLB export works.
export async function realisticHuman(draft:FittingDraft,anchors:HumanAnchors,seated:boolean){
 const asset=await loadHuman(),rig=clone(asset.scene)
 const mixer=new THREE.AnimationMixer(rig)
 if(asset.animations[0]){mixer.clipAction(asset.animations[0]).play();mixer.setTime(seated?3:0)}
 rig.updateMatrixWorld(true)
 const bone=(name:string)=>rig.getObjectByName(name) as THREE.Bone|undefined
 const pelvis=bone('pelvis')
 if(!pelvis)throw Error('人物骨骼不完整')
 // Fit the world-space rig to the same anchors used by assistive geometry.
 const move=(name:string,target:Point)=>{const node=bone(name);if(!node?.parent)return;node.position.copy(node.parent.worldToLocal(new THREE.Vector3(...target)));rig.updateMatrixWorld(true)}
 const aim=(name:string,childName:string,target:Point)=>{const node=bone(name),child=bone(childName);if(!node?.parent||!child)return;const start=node.getWorldPosition(new THREE.Vector3()),from=child.getWorldPosition(new THREE.Vector3()).sub(start).normalize(),to=new THREE.Vector3(...target).sub(start).normalize(),rotation=new THREE.Quaternion().setFromUnitVectors(from,to).multiply(node.getWorldQuaternion(new THREE.Quaternion()));node.quaternion.copy(node.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));rig.updateMatrixWorld(true)}
 const originalPelvis=pelvis.getWorldPosition(new THREE.Vector3()),originalShoulder=bone('upperarm_r')!.getWorldPosition(new THREE.Vector3())
 const feet=['r','l'].map(side=>({side,rotation:bone('foot_'+side)!.getWorldQuaternion(new THREE.Quaternion())}))
 const desiredShoulder=new THREE.Vector3(...anchors.shoulders[0]),torsoScale=(desiredShoulder.y-anchors.pelvis[1])/(originalShoulder.y-originalPelvis.y)
 const torsoBones=['spine_01','spine_02','spine_03','clavicle_r','clavicle_l','neck_01','head']
 const torsoTargets=torsoBones.map(name=>{const point=bone(name)!.getWorldPosition(new THREE.Vector3()).sub(originalPelvis);point.y*=torsoScale;point.x*=Math.abs(anchors.shoulders[0][0]/originalShoulder.x);point.add(new THREE.Vector3(...anchors.pelvis));return {name,point}})
 move('pelvis',anchors.pelvis)
 for(const {name,point} of torsoTargets)move(name,point.toArray() as Point)
 for(const [index,side] of ['r','l'].entries()){
  move('thigh_'+side,anchors.hips[index]);if(!seated)aim('thigh_'+side,'calf_'+side,anchors.knees[index]);move('calf_'+side,anchors.knees[index]);if(!seated)aim('calf_'+side,'foot_'+side,anchors.ankles[index]);move('foot_'+side,anchors.ankles[index])
  move('upperarm_'+side,anchors.shoulders[index]);aim('upperarm_'+side,'lowerarm_'+side,anchors.elbows[index]);move('lowerarm_'+side,anchors.elbows[index]);aim('lowerarm_'+side,'hand_'+side,anchors.wrists[index]);move('hand_'+side,anchors.wrists[index])
 }
 for(const {side,rotation} of feet){const node=bone('foot_'+side)!;node.quaternion.copy(node.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation))}rig.updateMatrixWorld(true)
 const result=new THREE.Group(),appearance=bodyAppearance(draft.body);result.name='自然人物-通用比例预览'
 const shape=(vertex:THREE.Vector3,name:string)=>{
  if(!appearance.approximate)return
  const amount=appearance.volume-1,torsoHeight=Math.max(.2,anchors.shoulders[0][1]-anchors.pelvis[1])
  if(/^(pelvis|spine_)/.test(name)){
   const t=THREE.MathUtils.clamp((vertex.y-anchors.pelvis[1])/torsoHeight,0,1),waist=Math.sin(t*Math.PI)
   const lateral=appearance.hipMeasured?waist*.65:.45+waist*.3
   vertex.x*=1+amount*lateral*(appearance.shoulderMeasured?1-t*.4:1)
   vertex.z=anchors.pelvis[2]+(vertex.z-anchors.pelvis[2])*(1+amount*(.7+waist*.5))
  }else if(/^(upperarm|lowerarm|thigh|calf)_/.test(name)){
   const index=name.endsWith('_r')?0:1,upper=name.startsWith('upperarm'),lower=name.startsWith('lowerarm'),thigh=name.startsWith('thigh')
   const a=new THREE.Vector3(...(upper?anchors.shoulders[index]:lower?anchors.elbows[index]:thigh?anchors.hips[index]:anchors.knees[index])),b=new THREE.Vector3(...(upper?anchors.elbows[index]:lower?anchors.wrists[index]:thigh?anchors.knees[index]:anchors.ankles[index])),axis=b.sub(a),t=THREE.MathUtils.clamp(vertex.clone().sub(a).dot(axis)/axis.lengthSq(),0,1),center=a.addScaledVector(axis,t),protectedEnd=lower&&appearance.wristMeasured||name.startsWith('calf')&&appearance.ankleMeasured
   vertex.sub(center).multiplyScalar(1+amount*.38*(protectedEnd?1-t:1)).add(center)
  }
 }
 rig.traverse(object=>{
  if(!(object instanceof THREE.SkinnedMesh)||object.name.toLowerCase().includes('accessory'))return
  object.skeleton.update()
  const geometry=object.geometry.clone(),positions=geometry.getAttribute('position'),indices=geometry.getAttribute('skinIndex'),weights=geometry.getAttribute('skinWeight'),vertex=new THREE.Vector3()
  const shaped=new THREE.Vector3(),blended=new THREE.Vector3();for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i);object.applyBoneTransform(i,vertex);vertex.applyMatrix4(object.matrixWorld);if(appearance.approximate&&indices&&weights){blended.set(0,0,0);let total=0;for(let j=0;j<4;j++){const weight=weights.getComponent(i,j);if(weight<=0)continue;shaped.copy(vertex);shape(shaped,object.skeleton.bones[indices.getComponent(i,j)]?.name??'');blended.addScaledVector(shaped,weight);total+=weight}if(total>0)vertex.copy(blended.divideScalar(total))}positions.setXYZ(i,vertex.x,vertex.y,vertex.z)}
  geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere()
  const materials=(Array.isArray(object.material)?object.material:[object.material]).map(material=>material.clone())
  const mesh=new THREE.Mesh(geometry,Array.isArray(object.material)?materials:materials[0]);mesh.name='人物-'+object.name;mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh)
 })
 mixer.stopAllAction();mixer.uncacheRoot(rig)
 result.userData={source:'/models/person-license.json',genericHuman:true,clinicalFitVerified:false,weightAppearance:appearance.approximate?'approximate visual volume only':'reference volume',measuredBodyDimensionsUnchanged:true}
 return result
}
