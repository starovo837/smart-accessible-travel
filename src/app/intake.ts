import { copyDictionary } from "./copyDictionary.ts";
import { modelKey } from './evidence.ts';
import type { ProductSource, SourceKind } from './product.ts';
export interface IntakeDraft {
    sources: ProductSource[];
    text: string;
}
export function inferSource(text: string, name = ''): SourceKind { const sample = name + ' ' + text.slice(0, 500); return /用户反馈|买家评价|用户评价|使用感受|评论/.test(sample) ? 'review' : /说明书|用户手册|使用手册|操作指南/.test(sample) ? 'manual' : /商家回复|客服回复/.test(sample) ? 'reply' : 'merchant'; }
export function textSource(text: string, id = 'draft-text'): ProductSource { return { id, name: copyDictionary.c225a4af8531028a2, kind: inferSource(text), text: text.trim(), modelKey: modelKey(text) }; }
export function intakeSources(sources: ProductSource[], text: string) { let id = 'draft-text', suffix = 1; while (sources.some(source => source.id === id))
    id = 'draft-text-' + (++suffix); const next = text.trim() ? [...sources, textSource(text, id)] : sources; if (next.length > 5)
    throw Error(copyDictionary.ce1612844d3de3c5d); return next; }
