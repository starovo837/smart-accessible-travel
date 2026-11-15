import { copyDictionary } from "./copyDictionary.ts";
import type { TravelPlanAction } from './travelTaskTypes';
export type TravelConflictKind = 'channel' | 'process' | 'instruction';
export interface TravelConflict {
    kind: TravelConflictKind;
    actions: TravelPlanAction[];
}
/** Evaluates authored constraints, never guesses the meaning of a free-text sentence. */
export function detectTravelConflict(a: TravelPlanAction, b: TravelPlanAction, unavailable: ReadonlySet<string>): TravelConflictKind | undefined {
    const x = a.constraints, y = b.constraints;
    if (!x || !y || x.task !== y.task)
        return;
    if (x.onlyChannel && y.onlyChannel && x.onlyChannel !== y.onlyChannel && unavailable.has(x.onlyChannel) && unavailable.has(y.onlyChannel))
        return 'channel';
    if ((x.minimumLeadMinutes !== undefined && y.minimizeWaiting) || (y.minimumLeadMinutes !== undefined && x.minimizeWaiting))
        return 'process';
    if (x.directive && y.directive && x.directive.key === y.directive.key && x.directive.value !== y.directive.value)
        return 'instruction';
}
/** Connected conflicts are replaced atomically: no original can survive in another pair. */
export function resolveTravelConflicts(actions: TravelPlanAction[], unavailable: ReadonlySet<string>, replace: (conflict: TravelConflict) => TravelPlanAction): TravelPlanAction[] {
    const graph = new Map<number, Set<number>>(), kinds = new Map<string, TravelConflictKind>();
    for (let i = 0; i < actions.length; i++)
        for (let j = i + 1; j < actions.length; j++) {
            const kind = detectTravelConflict(actions[i], actions[j], unavailable);
            if (!kind)
                continue;
            graph.set(i, new Set([...(graph.get(i) ?? []), j]));
            graph.set(j, new Set([...(graph.get(j) ?? []), i]));
            kinds.set(`${i}:${j}`, kind);
        }
    const visited = new Set<number>(), replacements = new Map<number, TravelPlanAction>();
    for (const start of graph.keys()) {
        if (visited.has(start))
            continue;
        const component: number[] = [], queue = [start];
        while (queue.length) {
            const index = queue.shift()!;
            if (visited.has(index))
                continue;
            visited.add(index);
            component.push(index);
            queue.push(...graph.get(index) ?? []);
        }
        component.sort((a, b) => a - b);
        const kind = component.some(i => component.some(j => kinds.get(`${Math.min(i, j)}:${Math.max(i, j)}`) === 'instruction')) ? 'instruction' : component.some(i => component.some(j => kinds.get(`${Math.min(i, j)}:${Math.max(i, j)}`) === 'channel')) ? 'channel' : 'process';
        const originals = component.map(index => actions[index]);
        const replacement = replace({ kind, actions: originals });
        if (!replacement.combined || !replacement.verification?.phone || !replacement.evidence.officialUrl)
            throw new Error(copyDictionary.c25ae2240e91a6c1a);
        replacements.set(component[0], replacement);
    }
    return actions.flatMap((action, index) => replacements.has(index) ? [replacements.get(index)!] : visited.has(index) ? [] : [action]);
}
