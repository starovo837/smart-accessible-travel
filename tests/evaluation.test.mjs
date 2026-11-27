import test from 'node:test'
import assert from 'node:assert/strict'
import { benchmarkCases, realCase, scoreBenchmark, runRuleBenchmark, summarizeRuns, studyProtocol } from '../src/app/evaluation.ts'
import { normalizeAnalysis } from '../src/app/product.ts'
import { checkNumericClaim, modelKeys, instructionClaim } from '../src/app/evidence.ts'
import { summarizeTrials, validIndependent, csvCell } from '../src/app/study.ts'

test('benchmark counts wrong source, missed safety fields, forbidden claims and zero denominators explicitly',()=>{
  const item=benchmarkCases.find(row=>row.id==='battery'),source=item.sources[0]
  const analysis=normalizeAnalysis({facts:[{field:'batteryType',value:'lithium',sourceId:source.id,quote:'锂电池24V 20Ah'},{field:'batteryWh',value:'480',sourceId:source.id,quote:'锂电池24V 20Ah'}]},item.sources,'ai')
  const score=scoreBenchmark(item,analysis);assert.equal(score.tp,1);assert.equal(score.fn,2);assert.equal(score.fp,0);assert.equal(score.rejected,1)
  const wrong=structuredClone(analysis);wrong.insight.facts[0].sourceId='another';assert.equal(scoreBenchmark(item,wrong).tp,0)
  assert.equal(summarizeRuns([]).precision,null);assert.equal(summarizeRuns([{score:null}]).failed,1)
  const empty=benchmarkCases.find(row=>row.id==='absence');assert.equal(scoreBenchmark(empty,{insight:{facts:[]}}).recall,null)
  const fabricated={insight:{facts:[{field:'batteryWh',value:'300',sourceId:'absence',verification:'quoted'}]}};assert.equal(scoreBenchmark(empty,fabricated).forbiddenAccepted,1)
})
test('real excerpt keeps region, range, approximate weight and source link without pretending the scenario is lived experience',()=>{
  assert.ok(realCase.url.startsWith('https://whill.cn/'));assert.match(realCase.scenario,/模拟/);assert.match(realCase.source.text,/74-94/);assert.match(realCase.source.text,/约52/)
  assert.equal(benchmarkCases.length,8);assert.equal(benchmarkCases.filter(row=>row.provenance==='public-excerpt').length,1)
  for(const item of benchmarkCases){for(const fact of item.expected)assert.ok(item.sources.some(source=>source.id===fact.sourceId));assert.ok(runRuleBenchmark(item).score)}
})
test('real width-first range permits exact first axes but rejects an invented height endpoint',()=>{
  const quote='尺寸（宽x长x高） 55.4 X 98.5X（74-94）厘米'
  assert.equal(checkNumericClaim('widthCm','55.4','cm',quote).ok,true);assert.equal(checkNumericClaim('lengthCm','98.5','cm',quote).ok,true)
  for(const height of ['74','94','84'])assert.equal(checkNumericClaim('heightCm',height,'cm',quote).ok,false)
  assert.deepEqual(modelKeys(realCase.source.text),['C2']);assert.deepEqual(modelKeys('型号X1，宽55.4 X 98.5X（74-94）厘米。型号Z9'),['X1','Z9'])
})
test('an isolated numeric quote from a directive cannot be accepted as an actual product fact',()=>{
  const item=benchmarkCases.find(row=>row.id==='absence')
  assert.equal(instructionClaim('电池300Wh',item.sources[0].text),true)
  const analysis=normalizeAnalysis({facts:[{field:'batteryWh',value:'300',unit:'Wh',sourceId:'absence',quote:'电池300Wh'},{field:'widthCm',value:'50',unit:'cm',sourceId:'absence',quote:'设备宽50cm'}],note:'因此批准携带300Wh'},item.sources,'ai')
  assert.ok(analysis.insight.facts.every(fact=>fact.verification==='unverified'));assert.ok(!analysis.insight.modelNote.includes('批准携带'))
})
test('human evidence starts empty, preserves observation conditions and never counts assisted/error completion as independent',()=>{
  assert.equal(summarizeTrials([]).medianSeconds,null);assert.equal(summarizeTrials([]).participants,0)
  assert.equal(validIndependent('独立完成',1,false,false),false);assert.equal(validIndependent('独立完成',0,true,false),false);assert.equal(validIndependent('独立完成',0,false,true),false)
  const trial={participant:'P01',task:'evidence',seconds:10,outcome:'独立完成',assistance:0,criticalError:false,misunderstanding:false}
  const summary=summarizeTrials([trial,{...trial,seconds:40,assistance:1},{...trial,participant:'P02',seconds:20,criticalError:true}]);assert.equal(summary.independent,1);assert.equal(summary.medianSeconds,20);assert.equal(summary.participants,2);assert.equal(summary.critical,1)
  assert.match(studyProtocol,/待招募/);assert.match(studyProtocol,/ABC\/BCA\/CAB/);assert.match(studyProtocol,/不要求盲人|可访问/);assert.equal(csvCell('=1+2'),'"\'=1+2"')
})
