import { copyDictionary as c } from './copyDictionary.ts'
import { safeServiceUrl } from './serviceProviders.ts'
import type { ModuleId } from './types.ts'

export type LearningCategory = 'reading' | 'education' | 'career' | 'courses' | 'tools' | 'rights'
export type AccessibilityFeature = 'captions' | 'screenReader' | 'signLanguage' | 'largeText' | 'keyboard' | 'audio'
export type SupportEvidence = 'stated' | 'unknown'
export interface LearningResource {
  id: string; name: string; org: string; category: LearningCategory; formats: string[]
  accessibility: Record<AccessibilityFeature, SupportEvidence> & { statementUrl?: string }
  targetUsers: ModuleId[]; region: string[]; language: string; fee: { kind: 'free' | 'mixed' | 'unknown'; text: string }
  account: string; scope: string; url: string; sourceUrl: string; verifiedAt: string; reviewDueAt: string
  status: 'verified' | 'review-due' | 'unverified'; fallback: { url: string; text: string }; notes: string
}
export const learningCategories: Record<LearningCategory, string> = { reading:c.learningReading, education:c.learningEducation, career:c.learningCareer, courses:c.learningCourses, tools:c.learningTools, rights:c.learningRights }
export const learningAccessLabels: Record<AccessibilityFeature,string> = { captions:c.learningCaptions, screenReader:c.learningScreenReader, signLanguage:c.learningSignLanguage, largeText:c.learningLargeText, keyboard:c.learningKeyboard, audio:c.learningAudio }
export const learningRegions = [c.learningNationwide,c.learningNingxia,c.learningJiangsu]
export const learningSources = {
  library:'https://www.cdlvi.cn/comment/basm',
  nlc:'https://app.nlc.cn/nlcapp/nlcdown.html',
  braille:'https://www.cdpf.org.cn/zzjg/jggk/zgclzssydw/index.htm',
  ouchn:'https://www.ouchn.edu.cn/',
  ningxia:'https://www.nxtvu.edu.cn/info/1081/13640.htm',
  nanjing:'https://www.njou.edu.cn/2024/1101/c20a54592/page.htm',
  cdpee:'https://www.bdpf.org.cn/cms68/web1459/subject/n1/n1459/n1551/n5605/n5606/c137942/content.html',
  vocational:'https://chinajob.mohrss.gov.cn/h5/zbzl/jycyhzypxzxfwpt/',
  smartedu:'https://system.smartedu.cn/npss/introdcution/1',
  mooc:'https://www.icourse163.org/',
  xuetang:'https://www.tsinghua.edu.cn/jyjx/zxjy/ptjs.htm',
  nvda:'https://www.nvaccess.org/about-nvda/',
  zdsr:'https://www.zdsr.com/',
  edge:'https://support.microsoft.com/zh-cn/education/learning-accelerators/use-immersive-reader-in-microsoft-edge-1',
  education:'https://www.beijing.gov.cn/zhengce/zhengcefagui/201905/t20190522_59961.html',
  exam:'https://www.moe.gov.cn/srcsite/A15/moe_776/s3258/201704/t20170428_303388.html',
  accesslaw:'https://gxca.miit.gov.cn/zwgk/zcwj/flfg/art/2024/art_340a68cb6a8e45ae81c121630dd37346.html',
}
const checked = '2026-11-16'
export function nextLearningReview(date: string): string { return new Date(Date.parse(date+'T00:00:00Z') + 90*86400000).toISOString().slice(0,10) }
type ResourceId = keyof typeof c.learningResourceDescriptions
function resource(id:ResourceId, category:LearningCategory, url:string, sourceUrl:string, options:Partial<LearningResource> = {}):LearningResource {
  return { id, ...c.learningResourceDescriptions[id], category, url, sourceUrl,
    formats:[c.learningText], accessibility:{captions:'unknown',screenReader:'unknown',signLanguage:'unknown',largeText:'unknown',keyboard:'unknown',audio:'unknown'},
    targetUsers:[],region:[c.learningNationwide],language:c.learningChinese,fee:{kind:'unknown',text:c.learningFeeUnknown},account:c.learningAccountUnknown,
    verifiedAt:checked,reviewDueAt:nextLearningReview(checked),status:'verified',fallback:{url:'https://www.cdpf.org.cn/',text:c.learningFallbackText},...options }
}
const supports = (features:AccessibilityFeature[], statementUrl?:string):LearningResource['accessibility'] => ({captions:'unknown',screenReader:'unknown',signLanguage:'unknown',largeText:'unknown',keyboard:'unknown',audio:'unknown',...Object.fromEntries(features.map(feature=>[feature,'stated'])),statementUrl})
const publicAccount = {account:c.learningAccountPublic}
export const learningResources:LearningResource[] = [
  resource('cdlvi','reading','https://www.cdlvi.cn/user/index',learningSources.library,{targetUsers:['vision'],formats:[c.learningText,c.learningAudio],account:c.learningAccountLibrary,accessibility:supports(['audio','screenReader','keyboard'],'https://www.cdlvi.cn/comment/wzasm')}),
  resource('nlc','reading',learningSources.nlc,learningSources.nlc,{formats:[c.learningText,c.learningAudio,c.learningVideo],accessibility:supports(['audio']),account:c.learningAccountCourses}),
  resource('braille','reading',learningSources.braille,learningSources.braille,{targetUsers:['vision'],formats:[c.learningText,c.learningAudio],accessibility:supports(['audio','largeText']),...publicAccount}),
  resource('ouchn','education',learningSources.ouchn,learningSources.ouchn,{fee:{kind:'unknown',text:c.learningTuition}}),
  resource('ningxia','education',learningSources.ningxia,learningSources.ningxia,{region:[c.learningNingxia],fee:{kind:'unknown',text:c.learningTuition}}),
  resource('nanjing','education',learningSources.nanjing,learningSources.nanjing,{region:[c.learningJiangsu],fee:{kind:'unknown',text:c.learningTuition}}),
  resource('cdpee','career','https://www.cdpee.org.cn/',learningSources.cdpee,{account:c.learningAccountEmployment}),
  resource('vocational','career','https://jc.mohrss.gov.cn/',learningSources.vocational,{formats:[c.learningText,c.learningVideo,c.learningAudio],accessibility:supports(['audio'])}),
  resource('career','career','https://www.cdpf.org.cn/fwpt1/jypx1/index.htm','https://www.cdpf.org.cn/fwpt1/jypx1/index.htm',publicAccount),
  resource('smartedu','courses','https://www.smartedu.cn/',learningSources.smartedu,{account:c.learningAccountCourses}),
  resource('mooc','courses',learningSources.mooc,learningSources.mooc,{account:c.learningAccountCourses,fee:{kind:'unknown',text:c.learningFeeUnknown}}),
  resource('xuetang','courses','https://www.xuetangx.com/',learningSources.xuetang,{account:c.learningAccountCourses}),
  resource('nvda','tools',learningSources.nvda,learningSources.nvda,{targetUsers:['vision'],language:c.learningMultilingual,formats:[c.learningSoftware],fee:{kind:'free',text:c.learningFree},accessibility:supports(['screenReader','keyboard']),...publicAccount}),
  resource('zdsr','tools',learningSources.zdsr,learningSources.zdsr,{targetUsers:['vision','mobility'],formats:[c.learningSoftware],fee:{kind:'mixed',text:c.learningMixed},accessibility:supports(['screenReader','keyboard'])}),
  resource('edge','tools',learningSources.edge,learningSources.edge,{targetUsers:['vision','cognitive'],formats:[c.learningSoftware],accessibility:supports(['screenReader','largeText']),...publicAccount}),
  resource('education','rights',learningSources.education,learningSources.education,publicAccount),
  resource('exam','rights',learningSources.exam,learningSources.exam,publicAccount),
  resource('accesslaw','rights',learningSources.accesslaw,learningSources.accesslaw,publicAccount),
]
export function learningResourceStatus(row:LearningResource,today = new Date().toLocaleDateString('en-CA')):LearningResource['status'] {
  if(row.status==='unverified' || !safeServiceUrl(row.url) || !safeServiceUrl(row.sourceUrl) || !Number.isFinite(Date.parse(row.verifiedAt)) || !Number.isFinite(Date.parse(row.reviewDueAt)))return 'unverified'
  return row.status==='review-due' || row.reviewDueAt < today ? 'review-due' : 'verified'
}
export interface LearningFilter { query?:string;category?:string;access?:string;region?:string;fee?:string;favoriteOnly?:boolean;sort?:'recommended'|'recent'|'verified';modules?:ModuleId[];goalCategory?:string;favorites?:string[];recent?:Record<string,string> }
export function findLearningResources(filter:LearningFilter, rows=learningResources):LearningResource[] {
  const terms=(filter.query??'').trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean)
  const goalMap:Record<string,LearningCategory[]>={degree:['education'],job:['career'],interest:['courses','reading'],access:['tools','rights']}
  const score=(r:LearningResource)=>r.targetUsers.filter(m=>filter.modules?.includes(m)).length*2+(goalMap[filter.goalCategory??'']?.includes(r.category)?3:0)
  const priority=['smartedu','cdlvi','mooc','ouchn','xuetang','nvda','zdsr','nlc']
  const rank=(r:LearningResource)=>priority.includes(r.id)?priority.indexOf(r.id):priority.length+rows.indexOf(r)
  return rows.filter(r=>learningResourceStatus(r)!=='unverified'&&terms.every(t=>[r.name,r.org,r.scope,learningCategories[r.category]].join(' ').toLocaleLowerCase().includes(t))&&(!filter.category||r.category===filter.category)&&(!filter.access||r.accessibility[filter.access as AccessibilityFeature]==='stated')&&(!filter.region||r.region.includes(c.learningNationwide)||r.region.includes(filter.region))&&(!filter.fee||r.fee.kind===filter.fee)&&(!filter.favoriteOnly||filter.favorites?.includes(r.id)))
    .sort((a,b)=>filter.sort==='recent'?(filter.recent?.[b.id]??'').localeCompare(filter.recent?.[a.id]??'')||rank(a)-rank(b):filter.sort==='verified'?b.verifiedAt.localeCompare(a.verifiedAt)||rank(a)-rank(b):score(b)-score(a)||rank(a)-rank(b))
}
