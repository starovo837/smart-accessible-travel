import { copyDictionary } from "./copyDictionary.ts";
/** Browser geolocation and OpenStreetMap input/output coordinates use WGS84. */
export interface Wgs84Location {
    latitude: number;
    longitude: number;
}
export const HOSPITAL_SEARCH_RADII = [2000, 5000, 10000] as const;
export type HospitalSearchRadius = typeof HOSPITAL_SEARCH_RADII[number];
export interface NearbyHospital extends Wgs84Location {
    id: string;
    name: string;
    category: 'hospital' | 'clinic';
    categoryLabel: string;
    address: string;
    distanceMeters: number;
    source: string;
    sourceUrl: string;
    rawTags: Record<string, string>;
    fetchedAt: string;
}
export interface NearbyHealthcareResult extends Wgs84Location {
    hospitals: NearbyHospital[];
    radius: HospitalSearchRadius;
    status: 'ok' | 'empty';
    notice: string;
    source: string;
    sourceUrl: string;
    license: string;
    fetchedAt: string;
}
export interface HospitalMapLink {
    provider: 'amap' | 'baidu';
    label: string;
    url: string;
    note?: string;
}
export function isValidWgs84Location(value: unknown): value is Wgs84Location {
    if (!value || typeof value !== 'object')
        return false;
    const { latitude, longitude } = value as Wgs84Location;
    return typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}
/** Great-circle distance between WGS84 points, in meters; never a route length. */
export function distanceMeters(from: Wgs84Location, to: Wgs84Location): number {
    if (!isValidWgs84Location(from) || !isValidWgs84Location(to))
        return NaN;
    const radians = (value: number) => value * Math.PI / 180;
    const h = Math.sin(radians(to.latitude - from.latitude) / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(radians(to.longitude - from.longitude) / 2) ** 2;
    return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function formatHospitalDistance(meters: number): string {
    if (!Number.isFinite(meters) || meters < 0)
        return copyDictionary.ceb0be575e2909ac7;
    return meters < 1000 ? copyDictionary.cc44b3719f133fa07 + Math.round(meters) + copyDictionary.c1aac8b956f808df5 : copyDictionary.cc44b3719f133fa07 + (meters / 1000).toFixed(1) + copyDictionary.ccc6d57236b8834e0;
}
const cleanText = (value: string, limit = 120): string => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : '';
function fixedMapUrl(base: string, parameters: Record<string, string>): string {
    const url = new URL(base);
    url.search = new URLSearchParams(parameters).toString();
    return url.toString();
}
/**
 * Baidu explicitly accepts WGS84 for nearby search. AMap search documents
 * center only on mobile and does not document a WGS84 switch for search;
 * use its documented WGS84 marker instead of passing raw GPS as GCJ02.
 * https://lbs.baidu.com/docs/webapi?title=mapadjustment/uri/web
 * https://developer.amap.com/api/uri-api/guide/search/search
 * https://developer.amap.com/api/uri-api/gettingstarted
 */
export function buildNearbyHospitalMapLinks(location: Wgs84Location, radius: HospitalSearchRadius = 2000): HospitalMapLink[] {
    if (!isValidWgs84Location(location) || !HOSPITAL_SEARCH_RADII.includes(radius))
        return [];
    return [
        {
            provider: 'baidu', label: copyDictionary.cff397b9541e8d6d6,
            url: fixedMapUrl('https://api.map.baidu.com/place/search', { query: copyDictionary.c1f6835c0d878fa0e, location: `${location.latitude},${location.longitude}`, radius: String(radius), coord_type: 'wgs84', output: 'html', src: 'webapp.smartAccessibleTravel.nearbyHospitals' }),
        },
        {
            provider: 'amap', label: copyDictionary.c2b7b11ad8d643acc,
            url: fixedMapUrl('https://uri.amap.com/marker', { position: `${location.longitude},${location.latitude}`, name: copyDictionary.c716944560c60774b, coordinate: 'wgs84', src: 'smartAccessibleTravel', callnative: '0' }),
            note: copyDictionary.c61b541ae5990043a,
        },
    ];
}
/** Manual city/district/address searches never fall back to a default city. */
export function buildHospitalRegionMapLinks(region: string): HospitalMapLink[] {
    const text = cleanText(region);
    if (!text)
        return [];
    return [
        { provider: 'amap', label: copyDictionary.c129f01b4d2ac20f9, url: fixedMapUrl('https://uri.amap.com/search', { keyword: copyDictionary.ce3b0c44298fc1c14 + text + copyDictionary.cc7fc9562763a333a, city: text, view: 'map', src: 'smartAccessibleTravel', callnative: '0' }) },
        { provider: 'baidu', label: copyDictionary.cac0e504e4708d015, url: fixedMapUrl('https://api.map.baidu.com/place/search', { query: copyDictionary.ce3b0c44298fc1c14 + text + copyDictionary.cc7fc9562763a333a, region: text, output: 'html', src: 'webapp.smartAccessibleTravel.hospitalRegion' }) },
    ];
}
/** Only the selected hospital's public map coordinates/name go into links. */
export function buildHospitalPlaceMapLinks(hospital: Pick<NearbyHospital, 'name' | 'latitude' | 'longitude'>): HospitalMapLink[] {
    if (!isValidWgs84Location(hospital))
        return [];
    const name = cleanText(hospital.name) || copyDictionary.c8a692f1aeaa9c22c;
    return [
        { provider: 'amap', label: copyDictionary.cde929bfc75648255, url: fixedMapUrl('https://uri.amap.com/marker', { position: `${hospital.longitude},${hospital.latitude}`, name, coordinate: 'wgs84', src: 'smartAccessibleTravel', callnative: '0' }) },
        { provider: 'baidu', label: copyDictionary.cecda302262e97049, url: fixedMapUrl('https://api.map.baidu.com/marker', { location: `${hospital.latitude},${hospital.longitude}`, title: name, content: copyDictionary.cb10c5b7f33945af7, coord_type: 'wgs84', output: 'html', src: 'webapp.smartAccessibleTravel.hospitalPlace' }) },
    ];
}
