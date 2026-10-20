import { modelKey } from './evidence.ts'
import type { ProductSource, SourceKind } from './product.ts'
export interface IntakeDraft {sources:ProductSource[];text:string}
export function inferSource(text:string,name=''):SourceKind{const sample=name+' '+text.slice(0,500);return /用户反馈|买家评价|用户评价|使用感受|评论/.test(sample)?'review':/说明书|用户手册|使用手册|操作指南/.test(sample)?'manual':/商家回复|客服回复/.test(sample)?'reply':'merchant'}
export function textSource(text:string,id='draft-text'):ProductSource{return {id,name:'本次商品文字',kind:inferSource(text),text:text.trim(),modelKey:modelKey(text)}}
export function intakeSources(sources:ProductSource[],text:string){let id='draft-text',suffix=1;while(sources.some(source=>source.id===id))id='draft-text-'+(++suffix);const next=text.trim()?[...sources,textSource(text,id)]:sources;if(next.length>5)throw Error('本次最多5份资料，请移除一份或分批解读。');return next}
