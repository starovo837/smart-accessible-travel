import { useCallback, useEffect, useRef, useState } from 'react'
import { FITTING_KEY, initialFitting, readFitting, serializedFitting, type FittingDraft } from './fitting'

export function useFittingDraft(){
  const [draft,setDraft]=useState<FittingDraft>(()=>{try{return readFitting(localStorage.getItem(FITTING_KEY))??initialFitting()}catch{return initialFitting()}})
  const [saveStatus,setSaveStatus]=useState(''),latest=useRef(draft)
  latest.current=draft
  const flush=useCallback(()=>{
    const current=latest.current
    if(!current.allowSave)return
    try{const now=Date.now();localStorage.setItem(FITTING_KEY,serializedFitting(current,now));setSaveStatus('已自动保存到此浏览器 · '+new Date(now).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}))}catch{setSaveStatus('自动保存失败，当前内容仅在内存中。请导出方案备份。')}
  },[])
  useEffect(()=>{if(!draft.allowSave){try{localStorage.removeItem(FITTING_KEY);setSaveStatus('本次临时使用，未写入浏览器存储')}catch{setSaveStatus('浏览器拒绝清除保存记录，请在浏览器设置中清除此网站数据。')}return}setSaveStatus('正在保存……');const timer=setTimeout(flush,600);return()=>clearTimeout(timer)},[draft,flush])
  useEffect(()=>{const visibility=()=>{if(document.visibilityState==='hidden')flush()};window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',visibility)}},[flush])
  const clear=useCallback(()=>{latest.current=initialFitting();setDraft(latest.current);localStorage.removeItem(FITTING_KEY);setSaveStatus('已清除三维尺寸与方案')},[])
  return {draft,setDraft,saveStatus,flush,clear}
}
