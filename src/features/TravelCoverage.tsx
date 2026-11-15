import { copyDictionary } from "../app/copyDictionary.ts";
import { getTravelMeta } from '../app/catalog';
import { ruleCurrent, rulesFor, type RuleDocument } from '../app/ruleCatalog';
import type { TravelContext } from '../app/types';
import { travelPlanSources } from '../app/travelPlanSources';
export function TravelCoverage({ mode, context, documents, loading, message, onRefresh }: {
    mode: string;
    context: TravelContext;
    documents: RuleDocument[];
    loading: boolean;
    message: string;
    onRefresh: () => void;
}) {
    const matching = rulesFor(mode, context, documents), when = Math.max(Date.now(), Date.parse(context.journeyDate ?? '') || 0), valid = matching.filter(rule => ruleCurrent(rule, when));
    return <section className="task-panel" aria-label={copyDictionary.c10e9b7a6ce9201ce}><h2>{copyDictionary.cb63aeea9f6b0c425}</h2><p>{copyDictionary.c83abd2a5765ec269}{getTravelMeta(mode).label}{copyDictionary.caf1c693f94450d80}{Object.keys(travelPlanSources).length}{copyDictionary.cadec0be3c63b5109}</p><p role="status">{matching.length ? copyDictionary.cc908b101a160abb6 + matching.length + copyDictionary.c9ad81f2d95299321 + valid.length + copyDictionary.ca1c1cb84146fb41c : copyDictionary.c2cfcc078a89cfa10}</p><p>{copyDictionary.c016dc7f6e7f3a1e3}{message}</p><button disabled={loading} onClick={onRefresh}>{loading ? copyDictionary.c21efcf4705af076e : copyDictionary.c567bd72fc20abce0}</button></section>;
}
