import { copyDictionary } from "./copyDictionary.ts";
import type { ProductAnalysis } from './types';
import type { ProductSource } from './product';
import { runInference } from './inference';
export async function analyzeSources(sources: ProductSource[], signal: AbortSignal, onProgress?: (message: string) => void): Promise<ProductAnalysis> {
    const payload = await runInference<{
        analysis?: ProductAnalysis;
        error?: string;
    }>('product/analyze', { sources, consent: true }, signal, onProgress);
    if (!payload.analysis?.insight)
        throw Error(payload.error || copyDictionary.ce6ac9a9b24a16403);
    return { ...payload.analysis, insight: { ...payload.analysis.insight, sources: sources.map(source => ({ ...source, ...payload.analysis!.insight!.sources.find(item => item.id === source.id), image: source.image })) } };
}
