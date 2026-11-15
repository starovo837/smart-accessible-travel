import { copyDictionary } from "./copyDictionary.ts";
import { apiFetch } from './transport';
type Job<T> = {
    taskId?: string;
    state?: 'running' | 'completed' | 'failed' | 'cancelled';
    result?: T;
    error?: string;
    progress?: string;
    elapsedSeconds?: number;
};
const pause = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const cancel = () => { clearTimeout(timer); reject(signal.reason); }, timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, 3000);
    signal.addEventListener('abort', cancel, { once: true });
});
// Short requests avoid the hosting proxy's synchronous inference timeout.
export async function runInference<T>(path: string, input: unknown, signal: AbortSignal, onProgress: (message: string) => void = () => { }): Promise<T> {
    let taskId: string | undefined;
    try {
        const response = await apiFetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'respond-async' }, signal, body: JSON.stringify(input) });
        const payload = await response.json().catch(() => ({ error: copyDictionary.c7652a85407e4ff45 }));
        if (!response.ok)
            throw Error(payload.error ?? copyDictionary.ce6ac9a9b24a16403);
        if (response.status !== 202)
            return payload as T;
        taskId = payload.taskId;
        if (!taskId || !/^([a-f0-9]{48})$/.test(taskId))
            throw Error(copyDictionary.c14c4fc7fea51bdcd);
        onProgress(copyDictionary.c5b838ed2a0f4f12c);
        let lastStage = '', lastElapsed = -30;
        for (;;) {
            await pause(signal);
            const poll = await apiFetch('/api/inference-jobs/' + taskId, { signal, cache: 'no-store' });
            const job: Job<T> = await poll.json().catch(() => ({ error: copyDictionary.c67f57abf2f5315c9 }));
            if (!poll.ok)
                throw Error(job.error ?? copyDictionary.c8bd29667163e08e4);
            if (job.state === 'completed' && job.result)
                return job.result;
            if (job.state !== 'running')
                throw Error(job.error ?? copyDictionary.c2046df2ed87fc32b);
            const elapsed = job.elapsedSeconds ?? 0;
            // Avoid repeatedly interrupting screen-reader users with a timer every 3s.
            if (job.progress !== lastStage || elapsed - lastElapsed >= 30) {
                onProgress((job.progress ?? copyDictionary.ce0fa7927a9e10512) + copyDictionary.c2428dec6eb9d2f58 + (elapsed < 60 ? elapsed + copyDictionary.c9dcdc2b289b9d233 : Math.floor(elapsed / 60) + copyDictionary.cb6a993c256ef577a + elapsed % 60 + copyDictionary.c9dcdc2b289b9d233) + copyDictionary.cd9a04357480296cf);
                lastStage = job.progress ?? '';
                lastElapsed = elapsed;
            }
        }
    }
    finally {
        if (taskId) {
            void apiFetch('/api/inference-jobs/' + taskId, { method: 'DELETE', keepalive: true }).catch(() => { });
        }
    }
}
