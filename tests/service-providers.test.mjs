import test from 'node:test'
import assert from 'node:assert/strict'
import {serviceProviders,safeServiceUrl,platformMapUrl,equipmentServiceNeeds,equipmentServiceMapLinks,equipmentProvidersForRegion,homeDevicePlatforms} from '../src/app/serviceProviders.ts'

test('real service directory retains safe official sources and never claims a completed booking',()=>{
 assert.ok(serviceProviders.length>=26)
 assert.equal(new Set(serviceProviders.map(provider=>provider.id)).size,serviceProviders.length)
 for(const provider of serviceProviders){assert.ok(safeServiceUrl(provider.url),provider.id);assert.ok(safeServiceUrl(provider.sourceUrl),provider.id+' source');assert.ok(provider.scope);assert.match(provider.verifiedAt,/^\d{4}-\d{2}-\d{2}$/);assert.ok(['external-only','not-booking'].includes(provider.booking))}
})

test('equipment channels cover multiple regions while keeping nationwide help for any region',()=>{
 const all=equipmentProvidersForRegion()
 assert.ok(all.length>=9)
 assert.ok(new Set(all.flatMap(provider=>provider.regions??[])).size>=4)
 for(const region of ['江苏','上海','四川','北京','云南']){
  const local=equipmentProvidersForRegion(region)
  assert.ok(local.some(provider=>provider.id==='cadtc'))
  assert.ok(local.some(provider=>provider.id==='equipment-hotline'))
  assert.ok(local.every(provider=>!provider.regions||provider.regions.includes(region)))
 }
 assert.ok(!equipmentProvidersForRegion('江苏').some(provider=>provider.id==='crrc-engineering'))
 assert.ok(equipmentProvidersForRegion('江苏').some(provider=>provider.id==='jiangsu-equipment'))
})

test('local equipment search requires an explicit region and sends only the selected service term',()=>{
 assert.deepEqual(equipmentServiceMapLinks('',equipmentServiceNeeds[0]),[])
 const region='南京市鼓楼区 & profile=private'
 const links=equipmentServiceMapLinks(region,'助听器验配')
 assert.equal(links.length,2)
 for(const link of links){
  const url=new URL(link.url)
  assert.equal(url.searchParams.get(link.platform==='amap'?'keyword':'query'),region+' 助听器验配')
  assert.equal(url.searchParams.has('profile'),false)
  assert.equal(url.searchParams.has('latitude'),false)
  assert.equal(url.href.includes('北京'),false)
 }
 assert.equal(new URL(equipmentServiceMapLinks('苏州','untrusted source text')[0].url).searchParams.get('keyword'),'苏州 辅具适配评估')
 assert.equal(new URL(equipmentServiceMapLinks('A\nB\u0000C','辅具租赁')[0].url).searchParams.get('keyword'),'ABC 辅具租赁')
})

test('home plans can choose several real device platforms without turning a website into a connection',()=>{
 assert.ok(homeDevicePlatforms.length>=6)
 for(const id of ['mijia','huawei-home','aqara-home','tuya-home','apple-home','ezviz-home'])assert.ok(homeDevicePlatforms.some(provider=>provider.id===id))
 assert.ok(homeDevicePlatforms.every(provider=>provider.category==='home'&&provider.id!=='home-adaptation'&&provider.booking==='not-booking'&&safeServiceUrl(provider.url)))
})
test('service links reject scripts, cleartext, credential URLs, false suffixes and nonstandard ports',()=>{
 for(const value of ['javascript:alert(1)','http://www.cdpf.org.cn/','https://www.cdpf.org.cn.evil.example/','https://www.cdpf.org.cn@evil.example/','https://user:pass@www.cdpf.org.cn/','https://www.cdpf.org.cn:8443/','file:///tmp/a'])assert.equal(safeServiceUrl(value),'')
 assert.equal(new URL(safeServiceUrl('https://www.cdpf.org.cn/')).hostname,'www.cdpf.org.cn')
})
test('domestic map searches encode only the explicit query and fixed platform options',()=>{
 const query='测试医院 北门 & role=PRIVATE?'
 const amap=new URL(platformMapUrl(query)),baidu=new URL(platformMapUrl(query,'baidu'))
 assert.equal(amap.hostname,'uri.amap.com');assert.equal(amap.searchParams.get('keyword'),query);assert.deepEqual([...amap.searchParams.keys()],['keyword','view','callnative'])
 assert.equal(baidu.hostname,'api.map.baidu.com');assert.equal(baidu.searchParams.get('query'),query);assert.deepEqual([...baidu.searchParams.keys()],['query','region','output','src'])
 for(const url of [amap,baidu]){assert.equal(url.searchParams.has('role'),false);assert.equal(url.searchParams.has('latitude'),false);assert.equal(url.searchParams.has('profile'),false)}
})
test('map search terms have bounded length and no control characters or empty destinations',()=>{
 assert.equal(platformMapUrl(' \u0000\n '),'')
 assert.equal(new URL(platformMapUrl('x'.repeat(200))).searchParams.get('keyword').length,160)
 assert.equal(new URL(platformMapUrl('A\nB\u0000C')).searchParams.get('keyword'),'ABC')
})
