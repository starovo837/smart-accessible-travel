import { copyDictionary } from "./copyDictionary.ts";
/** 用户自己选择的类别；多重残疾由两个以上类别推导，不能单独勾选。 */
export const disabilityCategories = [
    { id: 'vision', name: copyDictionary.c18ce674a8a2acbfd },
    { id: 'hearing', name: copyDictionary.ce2caddc4e2387523 },
    { id: 'speech', name: copyDictionary.c7424aa2db068ed28 },
    { id: 'physical', name: copyDictionary.ce458569077be0f97 },
    { id: 'intellectual', name: copyDictionary.cd1d8941d780723df },
    { id: 'mental', name: copyDictionary.c2e573f7afaaa1555 },
] as const;
export type DisabilityCategory = typeof disabilityCategories[number]['id'];
export type DisabilityGrade = 1 | 2 | 3 | 4;
export interface DisabilitySelection {
    category: DisabilityCategory;
    grade?: DisabilityGrade;
    accompaniment?: boolean;
    deviceIds: string[];
}
export interface DisabilityProfile {
    selections: DisabilitySelection[];
    primary?: DisabilityCategory;
}
const categoryOrder = new Map(disabilityCategories.map((item, index) => [item.id, index]));
const isCategory = (value: unknown): value is DisabilityCategory => typeof value === 'string' && categoryOrder.has(value as DisabilityCategory);
/** Reject unknown or duplicate entries without deriving disability from old need labels. */
export function normalizeDisabilityProfile(value: unknown): DisabilityProfile {
    if (!value || typeof value !== 'object')
        return { selections: [] };
    const source = value as {
        selections?: unknown;
        primary?: unknown;
    };
    if (!Array.isArray(source.selections))
        return { selections: [] };
    const seen = new Set<DisabilityCategory>();
    const selections: DisabilitySelection[] = [];
    for (const candidate of source.selections) {
        if (!candidate || typeof candidate !== 'object')
            continue;
        const item = candidate as Partial<DisabilitySelection>;
        if (!isCategory(item.category) || seen.has(item.category))
            continue;
        seen.add(item.category);
        const selection: DisabilitySelection = { category: item.category, deviceIds: Array.isArray(item.deviceIds) ? [...new Set(item.deviceIds.filter(id => typeof id === 'string' && id.length > 0 && id.length <= 100))].sort() : [] };
        if ([1, 2, 3, 4].includes(item.grade as number))
            selection.grade = item.grade;
        if (typeof item.accompaniment === 'boolean')
            selection.accompaniment = item.accompaniment;
        selections.push(selection);
    }
    selections.sort((a, b) => (a.grade ?? 5) - (b.grade ?? 5) || categoryOrder.get(a.category)! - categoryOrder.get(b.category)!);
    return { selections, ...(isCategory(source.primary) && seen.has(source.primary) ? { primary: source.primary } : {}) };
}
export function disabilitySummary(profile: DisabilityProfile) {
    const selections = normalizeDisabilityProfile(profile).selections;
    return {
        multiple: selections.length >= 2,
        // An unspecified grade can be more severe; don't infer an overall grade.
        overallGrade: selections.length >= 2 && selections.every(item => item.grade !== undefined)
            ? Math.min(...selections.map(item => item.grade!)) as DisabilityGrade : undefined,
        names: selections.map(item => disabilityCategories.find(category => category.id === item.category)!.name),
    };
}
