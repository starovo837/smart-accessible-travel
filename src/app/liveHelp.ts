import { copyDictionary } from "./copyDictionary.ts";
export interface HelpLocation {
    label: string;
    latitude?: number;
    longitude?: number;
}
export type HelpStatus = 'waiting' | 'acknowledged' | 'declined' | 'revoked' | 'expired';
export interface HelpResponse {
    status: 'acknowledged' | 'declined';
    name: string;
    at: number;
}
export interface HelpPublicRecord {
    id: string;
    text: string;
    recipientLabel: string;
    location?: HelpLocation;
    createdAt: number;
    expiresAt: number;
    status: 'waiting' | 'acknowledged' | 'declined';
    response?: HelpResponse;
}
export interface HelpCreatedRecord extends HelpPublicRecord {
    ownerToken: string;
    viewToken: string;
}
export interface HelpSessionRecord {
    id: string;
    ownerToken: string;
    viewUrl: string;
    expiresAt: number;
    recipientLabel: string;
    lastStatus: HelpStatus;
    response?: HelpResponse;
    linkAction?: 'copied' | 'shared';
}
export function helpState(record: HelpSessionRecord, now = Date.now()): HelpStatus { return record.lastStatus === 'revoked' ? 'revoked' : record.expiresAt <= now ? 'expired' : record.lastStatus; }
export const helpStatusText: Record<HelpStatus, string> = { waiting: copyDictionary.c2805ed1ffc54bf4f, acknowledged: copyDictionary.cd401afb6066f0345, declined: copyDictionary.c5bb10d52fe0ddeaa, revoked: copyDictionary.cfef96e34f77b742b, expired: copyDictionary.cb9d8853e0ce7e6ea };
export function helpUrl(base: string, id: string, viewToken: string) { const url = new URL(base); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw Error(copyDictionary.cb9b88aea24781e98); url.hash = 'help/' + id + '/' + viewToken; return url.toString(); }
export function sanitizeHelpSessions(raw: unknown): HelpSessionRecord[] {
    if (!Array.isArray(raw))
        return [];
    const rows: HelpSessionRecord[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^help-[a-f0-9]{24}$/.test(item.id) || typeof item.ownerToken !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(item.ownerToken) || typeof item.viewUrl !== 'string' || item.viewUrl.length > 2000 || typeof item.expiresAt !== 'number' || !Number.isFinite(item.expiresAt) || item.expiresAt <= 0 || item.expiresAt > 8.64e15 || !['waiting', 'acknowledged', 'declined', 'revoked', 'expired'].includes(item.lastStatus))
            continue;
        if (item.recipientLabel !== undefined && (typeof item.recipientLabel !== 'string' || item.recipientLabel.length > 60))
            continue;
        let viewUrl: string;
        try {
            const url = new URL(item.viewUrl), match = url.hash.match(/^#help\/(help-[a-f0-9]{24})\/([A-Za-z0-9_-]{32})$/);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !match || match[1] !== item.id || match[2] === item.ownerToken)
                continue;
            viewUrl = url.toString();
        }
        catch {
            continue;
        }
        let response: HelpResponse | undefined;
        if (item.response && typeof item.response === 'object' && ['acknowledged', 'declined'].includes(item.response.status) && typeof item.response.name === 'string' && item.response.name.length <= 40 && typeof item.response.at === 'number' && Number.isFinite(item.response.at) && item.response.at >= 0 && item.response.at <= 8.64e15)
            response = { status: item.response.status, name: item.response.name, at: item.response.at };
        if (['acknowledged', 'declined'].includes(item.lastStatus) && response?.status !== item.lastStatus)
            continue;
        const record: HelpSessionRecord = { id: item.id, ownerToken: item.ownerToken, viewUrl, expiresAt: item.expiresAt, recipientLabel: item.recipientLabel ?? '', lastStatus: item.lastStatus, ...(response ? { response } : {}), ...(['copied', 'shared'].includes(item.linkAction) ? { linkAction: item.linkAction } : {}) };
        const duplicate = rows.findIndex(row => row.id === record.id);
        if (duplicate >= 0)
            rows.splice(duplicate, 1);
        rows.push(record);
    }
    return rows.slice(-30);
}
