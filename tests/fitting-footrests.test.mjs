import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { initialFitting } from '../src/app/fitting.ts'
import { createFittingModel, disposeModel } from '../src/features/fitting/scene.ts'
import { poseRealisticHuman } from '../src/features/fitting/realisticHuman.ts'

const cases = [
  {height:'170',hip:'38',shin:'43',foot:'25',weight:'65',seat:48},
  {height:'145',hip:'30',shin:'30',foot:'20',weight:'40',seat:40},
  {height:'195',hip:'52',shin:'58',foot:'32',weight:'120',seat:65},
  {height:'180',hip:'40',shin:'60',foot:'28',weight:'90',seat:25},
]
function draftFor(row) {
  const draft=initialFitting()
  draft.aids=['wheelchair']
  draft.pose='seated'
  Object.assign(draft.body,{heightCm:row.height,hipWidthCm:row.hip,lowerLegCm:row.shin,footLengthCm:row.foot,weightKg:row.weight})
  draft.parameters.seatHeight=row.seat
  return draft
}
function plates(root) {
  const result=[];root.traverse(node=>{if(node.name==='足踏板')result.push(new THREE.Box3().setFromObject(node))});return result
}
function supported(foot,plate) {
  assert.ok(Math.abs(foot.min.y-plate.max.y)<.00001,`sole ${foot.min.y} should touch footrest top ${plate.max.y}`)
  assert.ok(foot.min.x>=plate.min.x-.0001&&foot.max.x<=plate.max.x+.0001,'foot width should be supported')
  assert.ok(foot.min.z>=plate.min.z-.0001&&foot.max.z<=plate.max.z+.0001,'heel and toes should remain above the footrest')
  assert.ok(plate.min.y>=.0299,'footrest must remain above the floor')
}

test('seated soles and footrests share support planes across measured leg lengths and seat heights',()=>{
  for(const row of cases){
    const model=createFittingModel(draftFor(row)),supports=plates(model.root),feet=[]
    model.placeholder.traverse(node=>{if(node.name==='足部')feet.push(new THREE.Box3().setFromObject(node))})
    assert.equal(supports.length,2)
    feet.forEach((foot,index)=>supported(foot,supports[index]))
    disposeModel(model.root)
  }
})

// Load the shipped rig without textures: rendering textures is unnecessary for
// validating posed shoe geometry, and this keeps the test entirely local.
async function localHuman() {
  const input=await fs.readFile(new URL('../public/models/person.glb',import.meta.url)),length=input.readUInt32LE(12)
  const json=JSON.parse(input.subarray(20,20+length).toString()),binary=input.subarray(28+length)
  for(const material of json.materials??[]){
    delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture
    if(material.pbrMetallicRoughness){delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture}
  }
  json.buffers[0].uri='data:application/octet-stream;base64,'+binary.toString('base64')
  globalThis.ProgressEvent??=class ProgressEvent {}
  return new GLTFLoader().parseAsync(JSON.stringify(json),'')
}

test('the shipped realistic shoes touch the footrests after skeletal retargeting, not just mannequin feet',async()=>{
  const asset=await localHuman(),source=asset.scene.getObjectByName('shoes01')
  assert.ok(source?.isSkinnedMesh,'the real shoe mesh must be available')
  const indices=source.geometry.getAttribute('skinIndex'),weights=source.geometry.getAttribute('skinWeight')
  for(const row of cases){
    const draft=draftFor(row),model=createFittingModel(draft),human=poseRealisticHuman(asset,draft,model.anchors,model.seated)
    const shoe=human.getObjectByName('人物-shoes01'),position=shoe.geometry.getAttribute('position'),bounds=[new THREE.Box3(),new THREE.Box3()]
    for(let i=0;i<position.count;i++){
      const sideWeights=[0,0]
      for(let j=0;j<4;j++){const name=source.skeleton.bones[indices.getComponent(i,j)]?.name??'';if(/^(foot|ball)_/.test(name))sideWeights[name.endsWith('_r')?0:1]+=weights.getComponent(i,j)}
      const side=sideWeights[0]>=.7?0:sideWeights[1]>=.7?1:-1
      if(side>=0)bounds[side].expandByPoint(new THREE.Vector3().fromBufferAttribute(position,i))
    }
    const supports=plates(model.root);bounds.forEach((foot,index)=>supported(foot,supports[index]))
    disposeModel(model.root);disposeModel(human)
  }
  disposeModel(asset.scene)
})

test('the default and wheelchair poses have level, supported shoes and independent leg rotations', async () => {
  const asset = await localHuman()
  const draft = initialFitting()
  assert.equal(draft.pose, 'standing')
  assert.deepEqual(draft.aids, [])
  const body = { ...draft.body }
  const pose = (seated) => {
    draft.pose = seated ? 'seated' : 'standing'
    draft.aids = seated ? ['wheelchair'] : []
    const model = createFittingModel(draft)
    let legs
    const human = poseRealisticHuman(asset, draft, model.anchors, model.seated, metrics => { legs = metrics })
    assert.equal(legs.length, 2)
    for (const leg of legs) {
      assert.ok(seated ? leg.kneeDegrees >= 85 && leg.kneeDegrees <= 95 : leg.kneeDegrees <= 5, JSON.stringify(leg))
      assert.ok(leg.calfFromVerticalDegrees <= 3, JSON.stringify(leg))
      assert.ok(leg.calfSkinAxisErrorDegrees <= 3, JSON.stringify(leg))
      assert.ok(leg.soleTiltDegrees !== null && leg.soleTiltDegrees <= 3, JSON.stringify(leg))
      assert.ok(leg.lowestSoleY !== null && Math.abs(leg.lowestSoleY - leg.supportY) <= .005, JSON.stringify(leg))
    }
    assert.deepEqual(draft.body, body)
    const shoe = human.getObjectByName('人物-shoes01').geometry.getAttribute('position').array.slice()
    disposeModel(model.root)
    disposeModel(human)
    return { legs, shoe }
  }
  const standing = pose(false)
  pose(true)
  assert.deepEqual(pose(false), standing)
  disposeModel(asset.scene)
})
