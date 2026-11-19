import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { publicSourceDate } from '../../app/sourceDate'
import { PageHeader } from '../../components/UI'
import { copyDictionary as c } from '../../app/copyDictionary'
import { learningResources, learningCategories, learningAccessLabels, learningRegions, findLearningResources, learningResourceStatus, type LearningFilter } from '../../app/learningCatalog'
import { initialLearning, removeLearning, sanitizeLearning } from '../../app/learningPlan'
import { safeServiceUrl } from '../../app/serviceProviders'
import { copyText, readText, stopReading } from '../../app/accessibility'
import type { LifeData, ModuleId } from '../../app/types'
import type { SupportToolId } from '../../app/supportCatalog'
import { LearningPlans } from './LearningPlans'
import { LearningGuides } from './LearningGuides'
import './learning.css'

export function OfficialLearningLink({url,children,onClick}:{url:string;children:React.ReactNode;onClick?:()=>void}) {
  const safe=safeServiceUrl(url)
  return safe?<a href={safe} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={onClick}>{children}<span aria-hidden="true"> ↗</span></a>:null
}
export function LearningCenter({life,setLife,modules,saved,onBack,onPrivacy,onTool}:{life:LifeData;setLife:Dispatch<SetStateAction<LifeData>>;modules:ModuleId[];saved:boolean;onBack:()=>void;onPrivacy:()=>void;onTool:(id:SupportToolId)=>void}) {
  const data=sanitizeLearning(life.learning),[filter,setFilter]=useState<LearningFilter>({sort:'recommended'}),[tab,setTab]=useState('resources'),[message,setMessage]=useState(''),[selected,setSelected]=useState<string[]>([])
  useEffect(()=>{stopReading();return stopReading},[])
  const update=(fn:(d:ReturnType<typeof initialLearning>)=>ReturnType<typeof initialLearning>)=>setLife(current=>({...current,learning:fn(sanitizeLearning(current.learning))}))
  const rows=findLearningResources({...filter,modules,favorites:data.favorites,recent:data.recent,goalCategory:data.plans[0]?.goalCategory})
  const filters=(key:keyof LearningFilter,value:string|boolean)=>setFilter(current=>({...current,[key]:value}))
  return <section className="screen learning-center"><PageHeader title={c.learningTitle} subtitle={c.learningSubtitle} onBack={onBack}/>
    <p>{saved?c.learningSaved:c.learningTemporary}</p>{!saved&&<button onClick={onPrivacy}>{c.learningPrivacy}</button>}
    <nav className="learning-tabs" aria-label={c.learningTitle}>{[['resources',c.learningBrowse],['plans',c.learningPlans],['accommodations',c.learningAccommodations],['tutorials',c.learningTutorials]].map(([id,title])=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>{stopReading();setTab(id);setMessage('')}}>{title}</button>)}</nav>
    <p role="status" className="learning-status">{message}</p>
    {tab==='resources'&&<><h2>{c.learningBrowse}</h2>
      <label className="learning-search">{c.learningSearch}<input type="search" maxLength={120} value={filter.query??''} onChange={e=>filters('query',e.target.value)}/></label>
      <details className="learning-filter-panel"><summary>{c.learningFilterOptions}</summary><div className="learning-filters">
      <label>{c.learningCategory}<select aria-label={c.learningCategory} value={filter.category??''} onChange={e=>filters('category',e.target.value)}><option value="">{c.learningAll}</option>{Object.entries(learningCategories).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
      <label>{c.learningAccessFilter}<select aria-label={c.learningAccessFilter} value={filter.access??''} onChange={e=>filters('access',e.target.value)}><option value="">{c.learningAll}</option>{Object.entries(learningAccessLabels).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
      <label>{c.learningRegion}<select aria-label={c.learningRegion} value={filter.region??''} onChange={e=>filters('region',e.target.value)}><option value="">{c.learningNationwide}</option>{learningRegions.slice(1).map(region=><option key={region}>{region}</option>)}</select></label>
      <label>{c.learningFee}<select aria-label={c.learningFee} value={filter.fee??''} onChange={e=>filters('fee',e.target.value)}><option value="">{c.learningAll}</option><option value="free">{c.learningFree}</option><option value="mixed">{c.learningMixed}</option><option value="unknown">{c.learningFeeUnknown}</option></select></label>
      <label>{c.learningSort}<select aria-label={c.learningSort} value={filter.sort} onChange={e=>filters('sort',e.target.value)}><option value="recommended">{c.learningRecommended}</option><option value="recent">{c.learningRecent}</option><option value="verified">{c.learningVerifiedSort}</option></select></label>
      <label className="learning-check"><input type="checkbox" checked={filter.favoriteOnly??false} onChange={e=>filters('favoriteOnly',e.target.checked)}/>{c.learningOnlyFavorites}</label>
    </div></details><p>{c.learningRecommendation}</p><p role="status">{c.learningCountPrefix}{rows.length}{c.learningCountSuffix}</p>
    <div className="learning-resources">{rows.map(resource=>{const reported=data.reports.some(r=>r.resourceId===resource.id),status=learningResourceStatus(resource),favorite=data.favorites.includes(resource.id)
      return <article className="learning-card" key={resource.id} aria-labelledby={'resource-'+resource.id}>
        <p className="learning-eyebrow">{learningCategories[resource.category]} · {resource.region.join(' / ')}</p><h3 id={'resource-'+resource.id}>{resource.name}</h3><p>{resource.org}</p><p>{resource.scope}</p>
        <dl><dt>{c.learningAudience}</dt><dd>{resource.targetUsers.length?resource.targetUsers.map(id=>id==='vision'?c.learningAudienceVision:id==='mobility'?c.learningAudienceMobility:c.learningAudienceCognitive).join(' / '):c.learningAudienceAll}</dd><dt>{c.learningLanguage}</dt><dd>{resource.language}</dd><dt>{c.learningFee}</dt><dd>{resource.fee.text}</dd><dt>{c.learningAccount}</dt><dd>{resource.account}</dd></dl>
        <ul className="learning-tags">{Object.entries(learningAccessLabels).filter(([key])=>resource.accessibility[key as keyof typeof learningAccessLabels]==='stated').map(([key,label])=><li key={key}>{label}</li>)}</ul>
        <details><summary>{c.learningAccessFilter}</summary><p>{c.learningSupportStated}</p><ul>{Object.entries(learningAccessLabels).map(([key,label])=><li key={key}>{label}：{resource.accessibility[key as keyof typeof learningAccessLabels]==='stated'?c.learningSupportStated:c.learningSupportUnknown}</li>)}</ul>{resource.accessibility.statementUrl&&<OfficialLearningLink url={resource.accessibility.statementUrl}>{c.learningStatement}</OfficialLearningLink>}</details>
        <p className="learning-boundary">{resource.notes}</p><p>{c.learningCheckedAt}<time dateTime={resource.verifiedAt}>{publicSourceDate(resource.verifiedAt)}</time>。{status==='verified'?c.learningVerified:status==='review-due'?c.learningReviewDue+'。':c.learningUnverified+'。'}</p><p>{c.learningReviewAt}<time dateTime={resource.reviewDueAt}>{publicSourceDate(resource.reviewDueAt)}</time>。</p>
        {reported&&<p className="learning-boundary">{c.learningReported}</p>}
        <div className="learning-actions"><OfficialLearningLink url={resource.url} onClick={()=>update(d=>({...d,recent:{...d.recent,[resource.id]:new Date().toISOString()}}))}>{c.learningOpen}</OfficialLearningLink><OfficialLearningLink url={resource.sourceUrl}>{c.learningSource}</OfficialLearningLink>
          <button aria-pressed={favorite} aria-label={`${resource.name}，${favorite?c.learningUnfavorite:c.learningFavorite}`} onClick={()=>update(d=>({...d,favorites:favorite?d.favorites.filter(id=>id!==resource.id):[...d.favorites,resource.id]}))}>{favorite?c.learningUnfavorite:c.learningFavorite}</button>
          <button onClick={()=>{setSelected([resource.id]);setTab('plans')}}>{c.learningAddPlan}</button>
          <button onClick={()=>void readText([resource.name,resource.scope,resource.fee.text,resource.account,resource.notes].join('。'))}>{c.learningRead}</button><button onClick={stopReading}>{c.learningStop}</button>
        </div><details><summary>{c.learningReport}</summary><div className="learning-actions">{([['link',c.learningReportLink],['access',c.learningReportAccess],['scope',c.learningReportScope]] as const).map(([kind,label])=><button key={kind} onClick={()=>{update(d=>({...d,reports:[...d.reports.filter(r=>r.resourceId!==resource.id),{resourceId:resource.id,kind,at:new Date().toISOString()}].slice(-100)}));setMessage(c.learningReportSaved)}}>{label}</button>)}{reported&&<button onClick={()=>update(d=>({...d,reports:d.reports.filter(r=>r.resourceId!==resource.id)}))}>{c.learningReportClear}</button>}</div><p>{c.learningReportSaved}</p></details>
        <details><summary>{c.learningFallback}</summary><p>{resource.fallback.text}</p><OfficialLearningLink url={resource.fallback.url}>{c.learningSource}</OfficialLearningLink><a href="tel:12385">12385</a></details>
      </article>})}</div>
      {!rows.length&&<section className="learning-card"><h3>{c.learningNoMatch}</h3><h3>{c.learningFindOwn}</h3><ol><li><strong>{c.learningKeywords}</strong><p>{c.learningKeywordExample}</p></li><li><strong>{c.learningAskWho}</strong><p>{c.learningAskWhoText}</p><a href="tel:12385">12385</a></li><li><strong>{c.learningAskHow}</strong><p>{c.learningAskScript}</p><button onClick={async()=>setMessage(await copyText(c.learningAskScript)?c.learningCopied:c.learningCopyFailed)}>{c.learningCopy}</button></li></ol></section>}
    </>}
    {tab==='plans'&&<LearningPlans life={life} setLife={setLife} selected={selected} setSelected={setSelected} onTool={onTool} notify={setMessage}/>}
    {(tab==='accommodations'||tab==='tutorials')&&<LearningGuides mode={tab} onTool={id=>id==='learning'?setTab('plans'):onTool(id)} onResources={()=>{setFilter({category:'tools',access:'screenReader',sort:'recommended'});setTab('resources');setMessage(c.learningScreenTools)}} notify={setMessage}/>}
    <footer><p>{c.learningPrivacyNote}</p><button onClick={()=>{if(window.confirm(c.learningClearConfirm)){stopReading();setLife(current=>removeLearning(current));setSelected([]);setMessage(c.learningClearDone)}}}>{c.learningClear}</button></footer>
  </section>
}
