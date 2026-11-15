import { copyDictionary } from "./copyDictionary.ts";
import type { TravelActionEvidence } from './travelTaskTypes';
/** Entry points checked against official publishers; no live facility status is implied. */
export interface TravelPlanSource {
    id: string;
    title: string;
    url: string;
    pageUpdatedAt: string | null;
    checkedAt: string;
    excerpt: string;
}
const checkedAt = '2026-11-06';
export const travelPlanSources: Record<string, TravelPlanSource> = {
    railAssistance: {
        id: 'rail-assistance', title: copyDictionary.ca904089e066b4f66,
        url: 'https://kyfw.12306.cn/otn/view/icentre_qxyyInfo.html', pageUpdatedAt: null, checkedAt,
        excerpt: copyDictionary.c261db0b39a73fa8e,
    },
    railEntry: {
        id: 'rail-entry', title: copyDictionary.c84e79b62d6fe4914,
        url: 'https://www.12306.cn/index/', pageUpdatedAt: null, checkedAt, excerpt: copyDictionary.c7431ef1a6273f7ef,
    },
    railComplaint: {
        id: 'rail-complaint', title: copyDictionary.c7a13a9fe17859513,
        url: 'https://kyfw.12306.cn/otn/view/advice_complaint.html', pageUpdatedAt: null, checkedAt,
        excerpt: copyDictionary.c2055c4beff45ed73,
    },
    transport: {
        id: 'transport-contact', title: copyDictionary.cc0aff725057c8ea3,
        url: 'https://www.mot.gov.cn/hudong/', pageUpdatedAt: null, checkedAt,
        excerpt: copyDictionary.ca2f4ee57d00473a9,
    },
    transportScope: {
        id: 'transport-scope', title: copyDictionary.c2a53eeecab6aa34a,
        url: 'https://xxgk.mot.gov.cn/jigou/ysfws/202109/t20210930_3620504.html',
        pageUpdatedAt: '2021-09-30', checkedAt, excerpt: copyDictionary.c7442f751cdc02faa,
    },
    shanghaiMetro: {
        id: 'shanghai-metro', title: copyDictionary.c7b15c07b869e1a02,
        url: 'https://www.shcn.gov.cn/col6991/20240318/1256444.html',
        pageUpdatedAt: '2024-03-17', checkedAt, excerpt: copyDictionary.c12cdd18d7ffba0a4,
    },
    hangzhouMetro: {
        id: 'hangzhou-metro', title: copyDictionary.ca996c82667c7d774,
        url: 'https://www.hzzx.gov.cn/cshz/content/2024-01/12/content_8673909.htm',
        pageUpdatedAt: '2024-01-12', checkedAt, excerpt: copyDictionary.ce9aa60bedb5bbd87,
    },
    airchina: {
        id: 'airchina-contact', title: copyDictionary.c8f47deee27441f08,
        url: 'https://webresource.airchina.com.cn/zh-CN/content/contact_us/customer/service_hotline/hotline/',
        pageUpdatedAt: null, checkedAt, excerpt: copyDictionary.c5b8ab615bdcd11e6,
    },
    ceair: {
        id: 'ceair-contact', title: copyDictionary.c96c719e53e1c13d0,
        url: 'https://global.ceair.com/global/static/MutualSupport/CommonProblem/passengernotice/',
        pageUpdatedAt: null, checkedAt, excerpt: copyDictionary.ca8284e19afc0dc66,
    },
    csair: {
        id: 'csair-contact', title: copyDictionary.c8768d726cde0a0f6,
        url: 'https://www.csair.com/cn/tourguide/faq/reserve/e-ticket.shtml',
        pageUpdatedAt: null, checkedAt, excerpt: copyDictionary.c54827745460b052b,
    },
    civilAviation: {
        id: 'aviation-contact', title: copyDictionary.cf6848bf5f03901d6,
        url: 'https://www.mot.gov.cn/hudong/', pageUpdatedAt: null, checkedAt,
        excerpt: copyDictionary.cb87fe8310d3f5ea1,
    },
};
export function safeOfficialTravelUrl(raw: string): string {
    try {
        const url = new URL(raw);
        const host = url.hostname.toLowerCase();
        const known = ['12306.cn', 'gov.cn', 'airchina.com.cn', 'airchina.com', 'ceair.com', 'csair.com', 'shmetro.com', 'hzmetro.com'];
        return url.protocol === 'https:' && !url.username && !url.password && !url.port && known.some(domain => host === domain || host.endsWith('.' + domain)) ? url.href : '';
    }
    catch {
        return '';
    }
}
export function sourceEvidence(source: TravelPlanSource, now: number): TravelActionEvidence {
    const stale = now > Date.parse(source.checkedAt + 'T23:59:59Z') + 30 * 86400000;
    return {
        level: 'official-excerpt', status: stale ? 'historical' : 'current',
        expiresAt: new Date(Date.parse(source.checkedAt + 'T23:59:59Z') + 30 * 86400000).toISOString(),
        updatedAt: (source.pageUpdatedAt ? copyDictionary.cf97cb089bf89619b + source.pageUpdatedAt : copyDictionary.cc939b86e636ef4b3) + copyDictionary.cf78489cb32d6cd6a + source.checkedAt,
        officialUrl: source.url, officialLabel: source.title, sourceTitle: source.title, originalText: source.excerpt,
    };
}
