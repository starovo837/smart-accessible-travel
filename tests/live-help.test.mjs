import test from 'node:test'
import assert from 'node:assert/strict'
import {createHelpService} from '../server/help-service.mjs'
import {helpState,helpStatusText,helpUrl,sanitizeHelpSessions} from '../src/app/liveHelp.ts'

const input=(overrides={})=>({text:'合成测试：请到服务台与我确认需要的协助。',recipientLabel:'测试接收人',minutes:15,consent:true,previewed:true,...overrides})
const code=(fn,status)=>assert.throws(fn,error=>error.status===status)

test('help creation requires explicit preview, per-request consent and an allowed short lifetime',()=>{
 const service=createHelpService();try{for(const change of [{consent:false},{previewed:false},{minutes:1},{minutes:120},{minutes:'15'}])code(()=>service.create(input(change)),400);for(const minutes of [15,30,60])assert.equal(service.create(input({minutes})).status,'waiting')}finally{service.dispose()}
})
test('help payload rejects unrelated sensitive fields and invalid or oversized data',()=>{
 const service=createHelpService();try{for(const change of [{body:{height:170}},{phone:'123456'},{modules:['vision']},{diagnosis:'private'},{text:'x'.repeat(1001)},{text:' '},{recipientLabel:'x'.repeat(61)},{location:{label:'x'.repeat(201)}},{location:{latitude:91,longitude:1}},{location:{latitude:20,longitude:'30'}},{location:{label:'测试',medical:'private'}}])code(()=>service.create(input(change)),400)}finally{service.dispose()}
})
test('capabilities are random, separate and absent from public responses',()=>{
 const service=createHelpService();try{const first=service.create(input()),second=service.create(input());assert.notEqual(first.id,second.id);assert.notEqual(first.ownerToken,first.viewToken);assert.notEqual(first.ownerToken,second.ownerToken);assert.match(first.viewToken,/^[A-Za-z0-9_-]{32}$/);const publicRecord=service.read(first.id,first.viewToken);for(const key of ['ownerToken','viewToken','ownerHash','viewHash'])assert.equal(publicRecord[key],undefined);code(()=>service.read(first.id,second.viewToken),403);code(()=>service.read(first.id,first.ownerToken),403);code(()=>service.readOwner(first.id,first.viewToken),403);code(()=>service.revoke(first.id,first.viewToken),403)}finally{service.dispose()}
})
test('only previewed location is shared and returned data cannot mutate stored content',()=>{
 const service=createHelpService();try{const absent=service.create(input());assert.equal(absent.location,undefined);const created=service.create(input({location:{label:'合成地点',latitude:30,longitude:120}}));created.location.label='changed';created.text='changed';const result=service.read(created.id,created.viewToken);assert.equal(result.location.label,'合成地点');assert.match(result.text,/合成测试/)}finally{service.dispose()}
})
test('copying or opening a link is never a response; only an explicit valid receipt changes state',()=>{
 let now=1000;const service=createHelpService({now:()=>now});try{const created=service.create(input());assert.equal(service.read(created.id,created.viewToken).status,'waiting');const metadata={id:created.id,ownerToken:created.ownerToken,viewUrl:helpUrl('https://demo.example/',created.id,created.viewToken),expiresAt:created.expiresAt,recipientLabel:'测试',lastStatus:'waiting',linkAction:'copied'};assert.equal(helpState(metadata,now),'waiting');assert.equal(helpStatusText[helpState(metadata,now)],'等待对方回应');code(()=>service.acknowledge(created.id,created.viewToken,{response:'sent'}),400);code(()=>service.acknowledge(created.id,created.ownerToken,{response:'acknowledged'}),403);now=2000;const acknowledged=service.acknowledge(created.id,created.viewToken,{response:'acknowledged',name:'测试人'});assert.equal(acknowledged.status,'acknowledged');assert.equal(acknowledged.response.at,2000);assert.equal(service.readOwner(created.id,created.ownerToken).response.name,'测试人');assert.equal(service.acknowledge(created.id,created.viewToken,{response:'acknowledged',name:'测试人'}).status,'acknowledged');code(()=>service.acknowledge(created.id,created.viewToken,{response:'declined',name:'other'}),409)}finally{service.dispose()}
})
test('a recipient may explicitly decline, and malformed replies do not count as acceptance',()=>{
 const service=createHelpService();try{const created=service.create(input());for(const reply of [{response:'acknowledged',name:'x'.repeat(41)},{response:'acknowledged',profile:'private'}])code(()=>service.acknowledge(created.id,created.viewToken,reply),400);assert.equal(service.readOwner(created.id,created.ownerToken).status,'waiting');const declined=service.acknowledge(created.id,created.viewToken,{response:'declined'});assert.equal(declined.status,'declined');assert.equal(declined.response.name,'')}finally{service.dispose()}
})
test('expiration immediately denies reading and acknowledgement',()=>{
 let now=1000;const service=createHelpService({now:()=>now});try{const created=service.create(input());now=created.expiresAt;code(()=>service.read(created.id,created.viewToken),410);code(()=>service.acknowledge(created.id,created.viewToken,{response:'acknowledged'}),403);assert.deepEqual(service.revoke(created.id,created.ownerToken),{revoked:true});assert.equal(helpState({lastStatus:'waiting',expiresAt:now},now),'expired')}finally{service.dispose()}
})
test('revocation removes the payload immediately and owner status never reverts to waiting',()=>{
 const service=createHelpService();try{const created=service.create(input());assert.deepEqual(service.revoke(created.id,created.ownerToken),{revoked:true});code(()=>service.read(created.id,created.viewToken),403);assert.deepEqual(service.revoke(created.id,created.ownerToken),{revoked:true});assert.equal(helpState({lastStatus:'revoked',expiresAt:0},1000),'revoked')}finally{service.dispose()}
})
test('expired requests release bounded server capacity',()=>{
 let now=1000;const service=createHelpService({now:()=>now,capacity:1});try{const first=service.create(input());code(()=>service.create(input()),429);now=first.expiresAt+1;assert.equal(service.create(input()).status,'waiting')}finally{service.dispose()}
})
test('view URLs contain only recipient capability and reject unsafe base protocols',()=>{
 const url=helpUrl('https://example.com/app/','help-test','recipient-token');assert.equal(url,'https://example.com/app/#help/help-test/recipient-token');assert.throws(()=>helpUrl('javascript:alert(1)','help-test','token'));assert.throws(()=>helpUrl('https://user:pass@example.com','help-test','token'))
})
test('restored help metadata validates capability URLs, limits history and excludes payloads',()=>{
 const service=createHelpService();try{const created=service.create(input()),row={id:created.id,ownerToken:created.ownerToken,viewUrl:helpUrl('https://example.com/',created.id,created.viewToken),expiresAt:created.expiresAt,recipientLabel:'测试',lastStatus:'waiting',text:'never persist',location:{label:'not metadata'}};const clean=sanitizeHelpSessions([row]);assert.equal(clean.length,1);assert.equal(clean[0].text,undefined);assert.equal(clean[0].location,undefined);for(const change of [{viewUrl:'javascript:alert(1)'},{ownerToken:'bad'},{expiresAt:Infinity},{viewUrl:'https://user:pass@example.com/#help/'+created.id+'/'+created.viewToken},{viewUrl:helpUrl('https://example.com/',created.id,created.ownerToken)},{recipientLabel:'x'.repeat(61)},{lastStatus:'sent'},{lastStatus:'acknowledged',response:undefined},{response:{status:'acknowledged',name:'x'.repeat(41),at:1},lastStatus:'acknowledged'}])assert.deepEqual(sanitizeHelpSessions([{...row,...change}]),[]);assert.equal(sanitizeHelpSessions([row,row]).length,1);const many=Array.from({length:35},()=>{const value=service.create(input());return {...row,id:value.id,ownerToken:value.ownerToken,viewUrl:helpUrl('https://example.com/',value.id,value.viewToken)}});assert.equal(sanitizeHelpSessions(many).length,30);assert.equal(sanitizeHelpSessions(null).length,0)}finally{service.dispose()}
})
