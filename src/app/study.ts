import { copyDictionary } from "./copyDictionary.ts";
export interface Trial {
    participant: string;
    input: string;
    environment: string;
    material: string;
    condition: string;
    task: string;
    at: string;
    seconds: number;
    outcome: string;
    assistance: number;
    misunderstanding: boolean;
    criticalError: boolean;
    ease: number | null;
    note: string;
}
export function validIndependent(outcome: string, help: number, critical: boolean, misunderstanding: boolean) {
    return outcome !== copyDictionary.c540b34cf3f460be5 || help === 0 && !critical && !misunderstanding;
}
export function summarizeTrials(trials: Trial[]) {
    const times = trials.map(t => t.seconds).sort((a, b) => a - b), n = times.length;
    return { tasks: n, participants: new Set(trials.map(t => t.participant)).size, independent: trials.filter(t => t.outcome === copyDictionary.c540b34cf3f460be5 && validIndependent(t.outcome, t.assistance, t.criticalError, t.misunderstanding)).length, critical: trials.filter(t => t.criticalError).length, misunderstanding: trials.filter(t => t.misunderstanding).length, assistance: trials.reduce((n, t) => n + t.assistance, 0), medianSeconds: n ? (times[Math.floor((n - 1) / 2)] + times[Math.floor(n / 2)]) / 2 : null };
}
export const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
