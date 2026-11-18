import { copyDictionary } from "../app/copyDictionary.ts";
import { getTravelMeta } from '../app/catalog';
import { ruleCurrent, rulesFor, safeRuleUrl, type RuleDocument } from '../app/ruleCatalog';
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
    const reviewed = documents.filter(rule => ruleCurrent(rule, when));
    return <section className="task-panel" aria-label={copyDictionary.c10e9b7a6ce9201ce}>
      <h2>{copyDictionary.cb63aeea9f6b0c425}</h2>
      <p role="status">{copyDictionary.ruleReviewedPrefix}{reviewed.length}{copyDictionary.ruleReviewedMiddle}{documents.length}{copyDictionary.ruleReviewedSuffix}</p>
      {!reviewed.length && <p>{copyDictionary.ruleNoReviewed}</p>}
      <p>{copyDictionary.ruleApplicablePrefix}{getTravelMeta(mode).label} · {valid.length}/{matching.length}</p>
      {reviewed.length > 0 && !valid.length && <p>{copyDictionary.ruleNoApplicable}</p>}
      <p>{copyDictionary.c83abd2a5765ec269}{getTravelMeta(mode).label}{copyDictionary.caf1c693f94450d80}{Object.keys(travelPlanSources).length}{copyDictionary.cadec0be3c63b5109}</p>
      <details><summary>{copyDictionary.ruleOfficialEntries}</summary><ul>{(matching.length ? matching : documents).map(rule => <li key={rule.id}><a href={safeRuleUrl(rule.url)} target="_blank" rel="noopener noreferrer">{rule.title}</a></li>)}</ul></details>
      <p>{copyDictionary.ruleRefreshNotice}</p>{message && <p role="status">{message}</p>}
      <button disabled={loading} onClick={onRefresh}>{loading ? copyDictionary.c21efcf4705af076e : copyDictionary.ruleRefreshRecords}</button>
    </section>;
}
