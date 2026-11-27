import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createWorkspaceService} from '../server/workspace-service.mjs'
const directory=await mkdtemp(join(tmpdir(),'accessible-workspace-'))
test.after(()=>rm(directory,{recursive:true,force:true}))
let now=Date.now();const store=createWorkspaceService({directory,now:()=>now})
test('actual correction lifecycle persists encrypted, requires capability and records an accountable resolution',async()=>{
 const item=await store.createCase({subject:'尺寸引用不一致',text:'原文宽68cm，模型提取60cm',consent:true})
 await assert.rejects(()=>store.getCase(item.id,'wrong'),/权限/)
 await assert.rejects(()=>store.reviewCase(item.id,{revision:1,status:'resolved',reviewer:'测试审核员',note:'核查完成'}),/依据/)
 const reviewed=await store.reviewCase(item.id,{revision:1,status:'resolved',reviewer:'测试审核员',note:'数值引用校验已拦截',reference:'本地验收版 2026-10-18'})
 assert.equal(reviewed.status,'resolved');assert.equal(reviewed.events.length,2)
 const reloaded=createWorkspaceService({directory,now:()=>now});assert.equal((await reloaded.getCase(item.id,item.accessToken)).status,'resolved')
 const saved=await readFile(join(directory,'workspace.enc'),'utf8');assert.ok(!saved.includes('原文宽68cm'));assert.ok(!saved.includes(item.accessToken))
 await store.replyCase(item.id,item.accessToken,{text:'补充另一处问题'});assert.equal((await store.getCase(item.id,item.accessToken)).status,'submitted')
 await store.deleteCase(item.id,item.accessToken);await store.deleteCase(item.id,item.accessToken);await assert.rejects(()=>store.getCase(item.id,item.accessToken),/权限/)
})
test('family scope is enforced on the server and a suggestion cannot confirm progress or alter device parameters',async()=>{
 const shared=await store.createShare({consent:true,scopes:['checklist'],allowSuggestions:true,days:1,payload:{devices:[{id:'private',name:'私密设备'}],records:[{reply:'私密回复'}],checklist:[{id:'one',label:'带说明书',detail:'纸本',checked:false}]}})
 assert.equal(shared.payload.devices,undefined);assert.equal(shared.payload.records,undefined)
 await assert.rejects(()=>store.getShare(shared.id,'wrong'),/凭据/)
 await assert.rejects(()=>store.updateShare(shared.id,shared.viewToken,{revision:1,payload:{}}),/凭据/)
 const proposed=await store.suggest(shared.id,shared.viewToken,{revision:1,itemId:'one',checked:true});assert.equal(proposed.payload.checklist[0].checked,false);assert.equal(proposed.proposals[0].checked,true)
 await assert.rejects(()=>store.updateShare(shared.id,shared.ownerToken,{revision:1,payload:{}}),/更新/)
 const accepted=await store.updateShare(shared.id,shared.ownerToken,{revision:proposed.revision,payload:{checklist:[{id:'one',label:'带说明书',checked:true}]},acceptedIds:['one']});assert.equal(accepted.payload.checklist[0].checked,true);assert.equal(accepted.proposals.length,0)
 await store.updateShare(shared.id,shared.ownerToken,{revision:accepted.revision,revoke:true});await assert.rejects(()=>store.getShare(shared.id,shared.viewToken),/撤销/)
 await store.deleteShare(shared.id,shared.ownerToken);await store.deleteShare(shared.id,shared.ownerToken)
})
test('read-only and expired family links do not grant suggestions or continued reading',async()=>{
 const shared=await store.createShare({consent:true,scopes:['checklist'],days:1,payload:{checklist:[{id:'one',label:'一',checked:false}]}})
 await assert.rejects(()=>store.suggest(shared.id,shared.viewToken,{revision:1,itemId:'one',checked:true}),/只允许查看/)
 now+=86400001;await assert.rejects(()=>store.getShare(shared.id,shared.viewToken),/到期/);await store.deleteShare(shared.id,shared.ownerToken)
})
