import { copyDictionary } from "./copyDictionary.ts";
import { factLabels, normalizeAnalysis, type ProductSource } from './product';
import { assistantInstructions, renderAssistantSelection, type AssistantEvidence } from './assistantEvidence';
import type { MLCEngine } from '@mlc-ai/web-llm';
let engine: MLCEngine | undefined, busy = false, generation = 0;
export const browserModel = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
export function browserAIAvailable() { return window.isSecureContext && location.protocol !== 'file:' && 'gpu' in navigator; }
export const browserAIReady = () => Boolean(engine);
export async function loadBrowserAI(progress: (text: string) => void, signal: AbortSignal) {
    if (!browserAIAvailable())
        throw Error(copyDictionary.c01c9d09fef6a94fa);
    if (engine)
        return engine;
    const version = ++generation, mlc = await import('@mlc-ai/web-llm');
    const candidate = new mlc.MLCEngine({ initProgressCallback: report => { if (!signal.aborted)
            progress(report.text); } });
    const cancel = () => { generation++; void candidate.unload(); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
        await candidate.reload(browserModel);
        if (signal.aborted || version !== generation) {
            await candidate.unload();
            throw new DOMException(copyDictionary.ca37778f17c5f3ee5, 'AbortError');
        }
        engine = candidate;
        return engine;
    }
    finally {
        signal.removeEventListener('abort', cancel);
    }
}
export async function unloadBrowserAI() { generation++; await engine?.unload(); engine = undefined; }
export async function clearBrowserAI() { if (busy)
    throw Error(copyDictionary.cda3df945b7e86532); await unloadBrowserAI(); const mlc = await import('@mlc-ai/web-llm'); await mlc.deleteModelAllInfoInCache(browserModel); }
async function generate(system: string, input: unknown, progress: (text: string) => void, signal: AbortSignal) {
    if (busy)
        throw Error(copyDictionary.c146a194d4331301b);
    busy = true;
    try {
        const model = await loadBrowserAI(progress, signal), cancel = () => model.interruptGenerate();
        signal.addEventListener('abort', cancel, { once: true });
        try {
            progress(copyDictionary.c28676c7f9709ec79);
            const output = await model.chat.completions.create({ messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(input) }], temperature: 0, max_tokens: 1500, response_format: { type: 'json_object' } });
            if (signal.aborted)
                throw new DOMException(copyDictionary.ca37778f17c5f3ee5, 'AbortError');
            const text = output.choices[0]?.message.content ?? '';
            return JSON.parse(text);
        }
        finally {
            signal.removeEventListener('abort', cancel);
        }
    }
    finally {
        busy = false;
    }
}
export async function analyzeInBrowser(sources: ProductSource[], progress: (text: string) => void, signal: AbortSignal) {
    if (sources.some(source => source.image))
        throw Error(copyDictionary.cfd518ce53dc5bc6b);
    if (sources.reduce((n, s) => n + s.text.length, 0) > 3500)
        throw Error(copyDictionary.c3468aba11217f549);
    const raw = await generate(copyDictionary.c8ec7a2f20baaaba2 + JSON.stringify(factLabels), sources, progress, signal);
    const result = normalizeAnalysis(raw, sources, 'ai');
    if (result.insight) {
        result.insight.engine = 'webllm';
        result.insight.model = browserModel;
    }
    return result;
}
export async function answerInBrowser(question: string, evidence: AssistantEvidence[], progress: (text: string) => void, signal: AbortSignal) { return renderAssistantSelection(await generate(assistantInstructions, { question, evidence }, progress, signal), evidence); }
