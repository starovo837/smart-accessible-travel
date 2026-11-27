import test from 'node:test'
import assert from 'node:assert/strict'
import { imageSummary, colorName } from '../src/app/dailyAssistance.ts'
import { initialJourney } from '../src/app/journey.ts'
import { scopeSnapshot } from '../src/app/storage.ts'
test('camera samples center color separately from overall brightness',()=>{
 const w=96,h=96,pixels=new Uint8ClampedArray(w*h*4)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,center=Math.abs(x-w/2)<w/6&&Math.abs(y-h/2)<h/6;pixels[i]=center?0:255;pixels[i+1]=center?80:255;pixels[i+2]=255;pixels[i+3]=255}
 const result=imageSummary(pixels,w,h);assert.equal(result.color,'蓝色');assert.equal(result.light,'很亮');assert.equal(colorName(0,0,0),'黑色');assert.equal(colorName(255,255,255),'白色')
})
test('custom daily tasks and progress are persisted only with life consent',()=>{
 const journey=initialJourney();journey.life.assistance={tasks:[{id:'daily-x',title:'合成任务',steps:['一','二']}],progress:{'daily-x':1}}
 const data={journey,modules:[],devices:[],consent:'granted',privacy:{profile:false,devices:false,life:false,retainDays:30},settings:{},feedback:[],customModes:[],customDevices:[]}
 assert.equal(scopeSnapshot(data).journey.life.assistance,undefined)
 const saved=scopeSnapshot({...data,privacy:{...data.privacy,life:true}});assert.equal(saved.journey.life.assistance.progress['daily-x'],1)
})
