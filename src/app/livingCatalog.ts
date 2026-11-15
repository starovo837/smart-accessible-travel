import { copyDictionary } from "./copyDictionary.ts";
import type { IconName } from '../components/Icons';
import type { SupportToolId } from './supportCatalog';
export type ServiceToolId = 'places' | 'healthcare' | 'live-help' | 'benefits' | 'equipment-service' | 'digital-help' | 'home-connect' | 'participation';
export type SceneId = 'hospital' | 'errands' | 'home' | 'work' | 'activity' | 'assistance';
export const livingEntries: {
    id: ServiceToolId;
    title: string;
    detail: string;
    icon: IconName;
}[] = [
    { id: 'places', title: copyDictionary.c3d50b3ab7aacd41a, detail: copyDictionary.cc2794d651e2564fa, icon: 'map-pin' },
    { id: 'healthcare', title: copyDictionary.ca8d199a7c34d4375, detail: copyDictionary.c0367f0f0554989fd, icon: 'hospital' },
    { id: 'live-help', title: copyDictionary.cc1ec5e0e6d50e455, detail: copyDictionary.c1a7b05b475d42f3e, icon: 'handshake' },
    { id: 'benefits', title: copyDictionary.c9dd05cc784dff794, detail: copyDictionary.cb86be76c066e499a, icon: 'documents' },
    { id: 'equipment-service', title: copyDictionary.cb09d86198686f906, detail: copyDictionary.c0ab3fdb08a717ce3, icon: 'equipment-care' },
    { id: 'digital-help', title: copyDictionary.caf3c7af0813d88f3, detail: copyDictionary.ce16340303e053421, icon: 'digital-form' },
    { id: 'home-connect', title: copyDictionary.ceac541e16c60e136, detail: copyDictionary.c46ad9f86506ec00d, icon: 'home-connect' },
    { id: 'participation', title: copyDictionary.c48f6e75b706dee26, detail: copyDictionary.c54c8822b63499ec1, icon: 'book-open' }
];
export const livingScenes: {
    id: SceneId;
    title: string;
    icon: IconName;
    detail: string;
}[] = [
    { id: 'hospital', title: copyDictionary.c80032f7396510aa5, icon: 'hospital', detail: copyDictionary.c6bec2948aca755d2 },
    { id: 'errands', title: copyDictionary.c7b7e354b38ac146d, icon: 'briefcase', detail: copyDictionary.c0f18e55a51c2d802 },
    { id: 'home', title: copyDictionary.c1d00249ab5c9d82d, icon: 'home', detail: copyDictionary.c7e9d464d1c86eff5 },
    { id: 'work', title: copyDictionary.c69416ab687ff0610, icon: 'book-open', detail: copyDictionary.c113f0373cb8ae395 },
    { id: 'activity', title: copyDictionary.c0eabd0f589234252, icon: 'leaf', detail: copyDictionary.c74983259e9ec2344 },
    { id: 'assistance', title: copyDictionary.cd366c6d4940b3b4f, icon: 'handshake', detail: copyDictionary.c337e61cac5bfe130 }
];
export interface SceneStep {
    id: string;
    title: string;
    detail: string;
    action: SupportToolId | 'fitting' | 'shop' | 'travel';
    button: string;
}
export const sceneSteps: Record<SceneId, SceneStep[]> = {
    hospital: [{ id: 'needs', title: copyDictionary.c211f59d2134ff459, detail: copyDictionary.c62daa72fc9e608bc, action: 'healthcare', button: copyDictionary.c74948bbee98e5ada }, { id: 'place', title: copyDictionary.c94ae6143c0693205, detail: copyDictionary.c4a9d3d888302b001, action: 'places', button: copyDictionary.c8806d5040e0dcc0e }, { id: 'talk', title: copyDictionary.ca5e032e5f6645f13, detail: copyDictionary.c501c5371b65878f8, action: 'communication', button: copyDictionary.caa6d9e3e320ed3cb }, { id: 'help', title: copyDictionary.ca34575f5e7577c36, detail: copyDictionary.c8e97371709388949, action: 'live-help', button: copyDictionary.c61d9000679f71d52 }],
    errands: [{ id: 'matter', title: copyDictionary.c7d8d0d88fbb20679, detail: copyDictionary.cfaa4bd8dfbb55a4d, action: 'benefits', button: copyDictionary.c933942355cbf19d6 }, { id: 'notice', title: copyDictionary.ca3079f3731287c3a, detail: copyDictionary.cc851b58eaf3b138e, action: 'digital-help', button: copyDictionary.c03ea01547f1a6ce3 }, { id: 'route', title: copyDictionary.ca480670b24e31b91, detail: copyDictionary.c69276d1324a6f742, action: 'places', button: copyDictionary.ce0b4ed3539bc91db }, { id: 'travel', title: copyDictionary.cc21b802e424a5966, detail: copyDictionary.c0423ab0c91c63228, action: 'travel', button: copyDictionary.c47e545a4312e3cdd }],
    home: [{ id: 'space', title: copyDictionary.ca80dc9746bba4a5e, detail: copyDictionary.cd13f9dd74a3d8db0, action: 'life', button: copyDictionary.c6d8700c928f1e7b6 }, { id: 'alerts', title: copyDictionary.c6e18b3ef28bee45d, detail: copyDictionary.c33a23dde6b4f9a10, action: 'home-connect', button: copyDictionary.c1227709eaced0736 }, { id: 'routine', title: copyDictionary.cf644056063afebea, detail: copyDictionary.ca6f7988bc266c322, action: 'steps', button: copyDictionary.cfa856d7eea08b687 }, { id: 'reminder', title: copyDictionary.cad8424d91ce16ed8, detail: copyDictionary.cab2f61b5d509901c, action: 'reminders', button: copyDictionary.c7039119d04f57374 }],
    work: [{ id: 'needs', title: copyDictionary.ca12b06ad6238a56e, detail: copyDictionary.cb29f9131750ac451, action: 'participation', button: copyDictionary.cab0ee6e5f81b64c3 }, { id: 'read', title: copyDictionary.c47ef222ce45a0715, detail: copyDictionary.cd319a3fcf351aa68, action: 'vision', button: copyDictionary.c2f534997d0b0b0d8 }, { id: 'communication', title: copyDictionary.cbcd7b8b1b4dfe011, detail: copyDictionary.c8749037f8c7e7655, action: 'communication', button: copyDictionary.cfbdd0161b6880896 }, { id: 'task', title: copyDictionary.cee21f51f074c40cd, detail: copyDictionary.c172af7cb4da3ce89, action: 'steps', button: copyDictionary.c1df2fe06754cf83c }],
    activity: [{ id: 'resource', title: copyDictionary.c08f0eb3807ccc2a1, detail: copyDictionary.c60128fcde9a21b87, action: 'participation', button: copyDictionary.c8bf4aa0c6b302795 }, { id: 'access', title: copyDictionary.c89b50c3901d125ae, detail: copyDictionary.c9092297aaf857175, action: 'places', button: copyDictionary.c19ef7c1c0f0ce59a }, { id: 'talk', title: copyDictionary.c1398b1507c0fd621, detail: copyDictionary.cec090fbc7daab593, action: 'communication', button: copyDictionary.cef573f832c77156f }, { id: 'transport', title: copyDictionary.ce2540496bee5fffc, detail: copyDictionary.c936c641407fc2c53, action: 'travel', button: copyDictionary.ca12bc04193aba11e }],
    assistance: [{ id: 'message', title: copyDictionary.ceebb6b890857c05c, detail: copyDictionary.c09c75ec641bf4c1b, action: 'live-help', button: copyDictionary.c228358f71fd90a26 }, { id: 'card', title: copyDictionary.c6220eb28d9e89cc1, detail: copyDictionary.cdf784783942b3ad1, action: 'help', button: copyDictionary.ce5770552e5368d07 }, { id: 'service', title: copyDictionary.cbdbcb445c41b00f3, detail: copyDictionary.c3cf3afae4e419832, action: 'equipment-service', button: copyDictionary.ca13d52ccfee925c1 }]
};
