import { copyDictionary } from "./copyDictionary.ts";
/** Public, manually checked service entry points. No provider API or booking claim. */
export interface ServiceProvider {
    id: string;
    name: string;
    category: 'map' | 'healthcare' | 'benefits' | 'equipment' | 'home' | 'participation';
    url: string;
    scope: string;
    /** Omitted for nationwide information / a multi-region service network. */
    regions?: string[];
    channel: 'official-site' | 'platform-search' | 'phone';
    phone?: string;
    description: string;
    verifiedAt: string;
    sourceUrl: string;
    booking: 'external-only' | 'not-booking';
}
const checked = '2026-10-26';
const expanded = '2026-10-27';
export const serviceProviders: ServiceProvider[] = [
    {
        id: 'amap', name: copyDictionary.c1ecb3ba10a167e3c, category: 'map', url: 'https://www.amap.com/',
        scope: copyDictionary.c97f2f49542090b09, channel: 'platform-search',
        description: copyDictionary.c1d8561bbebccd5fb,
        verifiedAt: checked, sourceUrl: 'https://lbs.amap.com/api/uri-api/guide/search/search', booking: 'not-booking',
    },
    {
        id: 'baidu-map', name: copyDictionary.c0750c665574fc2af, category: 'map', url: 'https://map.baidu.com/',
        scope: copyDictionary.caf09f68200960047, channel: 'platform-search',
        description: copyDictionary.c2ab2d60bc368f76d,
        verifiedAt: checked, sourceUrl: 'https://lbsyun.baidu.com/faq/api?title=webapi%2Furi%2Fweb', booking: 'not-booking',
    },
    {
        id: 'national-service', name: copyDictionary.cd4c973f750c201ae, category: 'benefits', url: 'https://gjzwfw.www.gov.cn/col/col881/',
        scope: copyDictionary.c75bc899987b0b4f0, channel: 'official-site',
        description: copyDictionary.ca8ab8ad5e48c8b19,
        verifiedAt: checked, sourceUrl: 'https://gjzwfw.www.gov.cn/col/col881/', booking: 'external-only',
    },
    {
        id: 'cdpf-app', name: copyDictionary.cb0a87273d33b956f, category: 'benefits', url: 'https://www.cdpf.org.cn/lwyd1/fwptydAPP2025/index.htm',
        scope: copyDictionary.c4fafbdd9585e6d2b, channel: 'official-site',
        description: copyDictionary.c76d92167a4551972,
        verifiedAt: checked, sourceUrl: 'https://www.cdpf.org.cn/lwyd1/fwptydAPP2025/index.htm', booking: 'external-only',
    },
    {
        id: 'cdpf-hotline', name: copyDictionary.c5dd49fb9cc74769f, category: 'benefits', url: 'https://www.cdpf.org.cn/',
        scope: copyDictionary.c5d76d739a781b92d, channel: 'phone', phone: '12385',
        description: copyDictionary.c111b9141d88b900a,
        verifiedAt: checked, sourceUrl: 'https://www.cdpf.org.cn/', booking: 'not-booking',
    },
    {
        id: 'crrc-hospital', name: copyDictionary.c1f6e467cf5c8cfb0, category: 'healthcare', url: 'https://www.crrc.com.cn/',
        scope: copyDictionary.ca37c72837ec4fc68, channel: 'official-site',
        description: copyDictionary.c14245ddb0ba2de75,
        verifiedAt: checked, sourceUrl: 'https://www.crrc.com.cn/', booking: 'external-only',
    },
    {
        id: 'beijing-114', name: copyDictionary.c4ec3107912a9e7ce, category: 'healthcare', url: 'https://english.bjchy.gov.cn/node/476',
        scope: copyDictionary.cd5d45f2b1acbd023, channel: 'phone', phone: '010-114',
        description: copyDictionary.cb14343e476b789af,
        verifiedAt: checked, sourceUrl: 'https://www.btch.edu.cn/docs/20220128165624411647.pdf', booking: 'external-only',
    },
    {
        id: 'crrc-engineering', name: copyDictionary.c1f15610ebaceb8c3, category: 'equipment', url: 'https://www.crrc.com.cn/Html/News/Articles/18273.html',
        scope: copyDictionary.cfd560c5296009dfc, regions: [copyDictionary.c68c77e155132565e], channel: 'official-site',
        description: copyDictionary.c06c132954be92957,
        verifiedAt: checked, sourceUrl: 'https://www.crrc.com.cn/Html/News/Articles/18273.html', booking: 'external-only',
    },
    {
        id: 'yuwell-service', name: copyDictionary.c4cb296391c6b8713, category: 'equipment', url: 'https://www.yuwell.com/news',
        scope: copyDictionary.cd067bd3ef27be74c, channel: 'phone', phone: '400-828-7768',
        description: copyDictionary.c18c72bb58b1d6497,
        verifiedAt: checked, sourceUrl: 'https://ai.yuyue.com.cn/yuwellScan/%E9%B1%BC%E8%B7%83%E5%81%A5%E5%BA%B7_%E9%9A%90%E7%A7%81%E6%94%BF%E7%AD%96.html', booking: 'external-only',
    },
    {
        id: 'cadtc', name: copyDictionary.c47409e11808c136e, category: 'equipment', url: 'https://www.cadtc.org.cn/index.html',
        scope: copyDictionary.c01984c95e4b94d31, channel: 'official-site',
        description: copyDictionary.c717525c300aadbaa,
        verifiedAt: expanded, sourceUrl: 'https://www.cadtc.org.cn/index.html', booking: 'not-booking',
    },
    {
        id: 'equipment-local-service', name: copyDictionary.c6e530843c296b1d4, category: 'equipment', url: 'https://gjzwfw.www.gov.cn/col/col881/',
        scope: copyDictionary.c9f271c52577d2b27, channel: 'official-site',
        description: copyDictionary.c07b46cd947735014,
        verifiedAt: expanded, sourceUrl: 'https://gjzwfw.www.gov.cn/col/col881/', booking: 'external-only',
    },
    {
        id: 'equipment-hotline', name: copyDictionary.cb7b5de48391114fb, category: 'equipment', url: 'https://www.cdpf.org.cn/',
        scope: copyDictionary.c245a5be986f1cb85, channel: 'phone', phone: '12385',
        description: copyDictionary.c0e8be869d6ca01e8,
        verifiedAt: expanded, sourceUrl: 'https://www.cdpf.org.cn/', booking: 'not-booking',
    },
    {
        id: 'ottobock', name: copyDictionary.c1f7da524111d0ff2, category: 'equipment', url: 'https://www.ottobock.com/zh-cn/company/aboutus',
        scope: copyDictionary.c9f9d4c6fcf15243a, channel: 'official-site', phone: '400-860-0306',
        description: copyDictionary.c84af3fd36a8f34d3,
        verifiedAt: expanded, sourceUrl: 'https://www.ottobock.com/zh-cn/company/aboutus', booking: 'external-only',
    },
    {
        id: 'jiangsu-equipment', name: copyDictionary.c4bd6e18588727187, category: 'equipment', url: 'https://service.jscl.gov.cn/',
        scope: copyDictionary.c045a56873b63dd5e, regions: [copyDictionary.ceee4f90829f0c985], channel: 'official-site',
        description: copyDictionary.c2fd8834e4c790698,
        verifiedAt: expanded, sourceUrl: 'https://service.jscl.gov.cn/', booking: 'external-only',
    },
    {
        id: 'shanghai-equipment', name: copyDictionary.ce056808e2a98e2d1, category: 'equipment', url: 'https://www.shdpf.org.cn/',
        scope: copyDictionary.cad7d92263001a432, regions: [copyDictionary.c4906a49adc5c472b], channel: 'official-site',
        description: copyDictionary.c30ea92cdd9ee53e1,
        verifiedAt: expanded, sourceUrl: 'https://www.shdpf.org.cn/', booking: 'external-only',
    },
    {
        id: 'sichuan-equipment', name: copyDictionary.cf490301884974cb4, category: 'equipment', url: 'https://www.scmzkf.cn/',
        scope: copyDictionary.cd1c8590cfcfc7523, regions: [copyDictionary.c981aae92d74e28dd], channel: 'official-site', phone: '028-85433201',
        description: copyDictionary.ce42811fd074bc60f,
        verifiedAt: expanded, sourceUrl: 'https://www.scmzkf.cn/', booking: 'external-only',
    },
    {
        id: 'home-adaptation', name: copyDictionary.c8072390f1f8f906a, category: 'home', url: 'https://gjzwfw.www.gov.cn/col/col881/',
        scope: copyDictionary.cdad9d1edc6d92756, channel: 'official-site',
        description: copyDictionary.c57d55b003722bfe7,
        verifiedAt: checked, sourceUrl: 'https://gjzwfw.www.gov.cn/col/col881/', booking: 'external-only',
    },
    {
        id: 'mijia', name: copyDictionary.c1ec40d8a4438f9e5, category: 'home', url: 'https://home.mi.com/index.html',
        scope: copyDictionary.cfe4d82bad57d127d, channel: 'official-site',
        description: copyDictionary.c268cdf3506fd5682,
        verifiedAt: checked, sourceUrl: 'https://ics-resources.xiaomi.com/ics-resources/articles/60bf175420a523e5ed34b3f3.html', booking: 'not-booking',
    },
    {
        id: 'huawei-home', name: copyDictionary.c00d6217dbf1ea6c9, category: 'home', url: 'https://consumer.huawei.com/cn/support/content/zh-cn00752582/',
        scope: copyDictionary.c693ea3bd5c8f4693, channel: 'official-site',
        description: copyDictionary.cf36b640629992c6f,
        verifiedAt: expanded, sourceUrl: 'https://consumer.huawei.com/cn/support/content/zh-cn00752582/', booking: 'not-booking',
    },
    {
        id: 'aqara-home', name: copyDictionary.c1f024e35205d1454, category: 'home', url: 'https://www.aqara.cn/cn/smart-video-doorbell_g4_support',
        scope: copyDictionary.c4b2f4e946c78c6e9, channel: 'official-site',
        description: copyDictionary.c6bd222ca0334764a,
        verifiedAt: expanded, sourceUrl: 'https://www.aqara.cn/cn/smart-video-doorbell_g4_support', booking: 'not-booking',
    },
    {
        id: 'tuya-home', name: copyDictionary.c2efac7c65698ef38, category: 'home', url: 'https://developer.tuya.com/cn/docs/iot/public-app?id=Karuhr4f5eki8',
        scope: copyDictionary.c085427e3bc46df16, channel: 'official-site',
        description: copyDictionary.cf43455f55a8509f9,
        verifiedAt: expanded, sourceUrl: 'https://developer.tuya.com/cn/docs/iot/public-app?id=Karuhr4f5eki8', booking: 'not-booking',
    },
    {
        id: 'apple-home', name: copyDictionary.cf41a91736184bdc2, category: 'home', url: 'https://www.apple.com.cn/home-app/',
        scope: copyDictionary.ca6d13f9397f2e025, channel: 'official-site',
        description: copyDictionary.c9ac3e3bd3aec4cbe,
        verifiedAt: expanded, sourceUrl: 'https://www.apple.com.cn/home-app/', booking: 'not-booking',
    },
    {
        id: 'ezviz-home', name: copyDictionary.c6470a19f15af6f25, category: 'home', url: 'https://www.ys7.com/portal/app.html',
        scope: copyDictionary.caa350b5dc95e3a10, channel: 'official-site',
        description: copyDictionary.c68ac27ca99f59186,
        verifiedAt: expanded, sourceUrl: 'https://www.ys7.com/portal/app.html', booking: 'not-booking',
    },
    {
        id: 'cdpee', name: copyDictionary.c3d8c8ac984316d2a, category: 'participation', url: 'https://www.cdpee.org.cn/',
        scope: copyDictionary.c8cf4d51cad704774, channel: 'official-site',
        description: copyDictionary.ccfd9f5cac9fb938c,
        verifiedAt: checked, sourceUrl: 'https://www.bdpf.org.cn/cms68/web1459/subject/n1/n1459/n1551/n5605/n5606/c137942/content.html', booking: 'external-only',
    },
    {
        id: 'smartedu', name: copyDictionary.cca578ab343c5e1b0, category: 'participation', url: 'https://www.smartedu.cn/',
        scope: copyDictionary.cc6d18d9bb397e0dc, channel: 'official-site',
        description: copyDictionary.cf0a366a7790922d4,
        verifiedAt: checked, sourceUrl: 'https://system.smartedu.cn/', booking: 'not-booking',
    },
    {
        id: 'accessible-library', name: copyDictionary.c85d7cc08ffc3aedd, category: 'participation', url: 'https://www.cdlvi.cn/user/index',
        scope: copyDictionary.c3e94dbbff6d68ec5, channel: 'official-site',
        description: copyDictionary.c7f3c420135d465e3,
        verifiedAt: checked, sourceUrl: 'https://www.cdlvi.cn/comment/basm', booking: 'not-booking',
    },
];
// Validate scheme and a specific host allowlist. It is not a redirect or service
// availability guarantee. User-entered facility notes are never put into URLs.
const allowedHosts = new Set([
    'www.amap.com', 'uri.amap.com', 'map.baidu.com', 'api.map.baidu.com',
    'gjzwfw.www.gov.cn', 'www.cdpf.org.cn', 'www.crrc.com.cn', 'www.cdpee.org.cn',
    'www.cdlvi.cn', 'cdlvi.cn', 'www.smartedu.cn', 'system.smartedu.cn',
    'home.mi.com', 'ics-resources.xiaomi.com', 'www.yuwell.com', 'ai.yuyue.com.cn',
    'english.bjchy.gov.cn', 'www.btch.edu.cn', 'www.bdpf.org.cn', 'lbs.amap.com',
    'lbsyun.baidu.com',
    'www.cadtc.org.cn', 'www.ottobock.com', 'service.jscl.gov.cn', 'www.shdpf.org.cn', 'www.scmzkf.cn',
    'consumer.huawei.com', 'www.aqara.cn', 'developer.tuya.com', 'support.tuya.com', 'www.apple.com.cn', 'www.ys7.com',
]);
export function safeServiceUrl(raw: string): string {
    try {
        const url = new URL(raw);
        return url.protocol === 'https:' && !url.username && !url.password && !url.port && allowedHosts.has(url.hostname.toLowerCase()) ? url.toString() : '';
    }
    catch {
        return '';
    }
}
export type MapPlatform = 'amap' | 'baidu';
/** Only the explicit place query is sent; no location or profile is attached. */
export function platformMapUrl(query: string, platform: MapPlatform = 'amap'): string {
    const text = query.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160);
    if (!text)
        return '';
    const url = new URL(platform === 'baidu' ? 'https://api.map.baidu.com/place/search' : 'https://uri.amap.com/search');
    if (platform === 'baidu') {
        url.search = new URLSearchParams({ query: text, region: copyDictionary.c08bdf43e65a521a0, output: 'html', src: 'webapp.smartAccessibleTravel.placeSearch' }).toString();
    }
    else {
        url.search = new URLSearchParams({ keyword: text, view: 'map', callnative: '0' }).toString();
    }
    return safeServiceUrl(url.toString());
}
export const equipmentServiceNeeds = [copyDictionary.cf08276478b7ecc2c, copyDictionary.c493ef87e33a7c516, copyDictionary.cecd23e31f8cae1b3, copyDictionary.c2604291840968e3b, copyDictionary.c5a3af8aa01287602, copyDictionary.c51b1dc2395acbfe4, copyDictionary.cdd9f961dac4b324c, copyDictionary.c631454301e7e7b2a] as const;
/** Send only the city and service term explicitly supplied for this search. */
export function equipmentServiceMapLinks(region: string, need: string) {
    const city = region.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
    if (!city)
        return [];
    const service = equipmentServiceNeeds.find(item => item === need) ?? equipmentServiceNeeds[0];
    const query = `${city} ${service}`;
    return (['amap', 'baidu'] as const).map(platform => ({ platform, label: platform === 'amap' ? copyDictionary.c0e475bd3694f2a91 : copyDictionary.c1859df746336a600, url: platformMapUrl(query, platform) }));
}
export function equipmentProvidersForRegion(region = '') {
    return serviceProviders.filter(provider => provider.category === 'equipment' && (!region || !provider.regions || provider.regions.includes(region)));
}
export const homeDevicePlatforms = serviceProviders.filter(provider => provider.category === 'home' && provider.id !== 'home-adaptation');
