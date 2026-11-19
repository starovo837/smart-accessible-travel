import { copyDictionary } from "./copyDictionary.ts";
import { ruleCatalog } from './ruleCatalog.ts';
import { travelPlanSources } from './travelPlanSources.ts';
export const ABOUT_VERSION = '0.6.1';
export const ABOUT_UPDATED_AT = '2026-11-19';
const sourceCount = ruleCatalog.length + Object.keys(travelPlanSources).length;
export const aboutSections = [
    {
        id: 'audience',
        title: copyDictionary.c3e646bae90a76f7b,
        items: [copyDictionary.c1450eed9f9b92e29, copyDictionary.cab57451d555de128],
    },
    {
        id: 'can-do',
        title: copyDictionary.cefe04f0c2cd44264,
        items: [copyDictionary.c869a6f01445d5960, copyDictionary.c8a5b3fff7365a4ad, copyDictionary.c1c4465a99437623e],
    },
    {
        id: 'cannot-do',
        title: copyDictionary.c2de2208e6c16c88d,
        items: [copyDictionary.c6e88b6d3bcdb3e85, copyDictionary.cb0fa6ab7407453d7, copyDictionary.cb4e499005c8413ff, copyDictionary.c5757d7f6a9b7242a, copyDictionary.c970db6f028a97e8c],
    },
    {
        id: 'sources',
        title: copyDictionary.c6b26ae91e62ed86c,
        items: [
            copyDictionary.cfca05ffcbef130d7 + sourceCount + copyDictionary.c83d7f571ffd4c16a,
            copyDictionary.learningAboutSources,
            copyDictionary.c4fa404dc4d124fbf,
            copyDictionary.cf4c41ffc14a278e1,
            copyDictionary.c739c4f058ed13d76,
            copyDictionary.cb8e715e2fcd7f650,
        ],
    },
    {
        id: 'privacy',
        title: copyDictionary.c4e75e2780cdc92ac,
        items: [copyDictionary.c0b19ad152664f6be, copyDictionary.c528eb137016ad97d, copyDictionary.cecc49895694b0e50],
    },
    {
        id: 'version',
        title: copyDictionary.c7953313880d9f42c,
        items: [copyDictionary.cf4f16d00806f7992 + ABOUT_VERSION + copyDictionary.ceb0d5884569b398e, copyDictionary.cc5a3508aadd99027 + ABOUT_UPDATED_AT + copyDictionary.ceb0d5884569b398e],
    },
] as const;
export const updateHistory = [
    { version: ABOUT_VERSION, date: ABOUT_UPDATED_AT, change: copyDictionary.campusCoverVersionChange, reason: copyDictionary.campusCoverVersionReason },
    { version: '0.6.0', date: '2026-11-19', change: copyDictionary.campusVersionChange, reason: copyDictionary.campusVersionReason },
    { version: copyDictionary.learningVersionName, date: '2026-11-16', change: copyDictionary.learningVersionChange, reason: copyDictionary.learningVersionReason },
    { version: copyDictionary.c3b5340343166af94, date: '2026-11-13', change: copyDictionary.cf50bb27ed5de4790, reason: copyDictionary.c0b63ada0ca51f347 },
    { version: copyDictionary.c9fa90bb0c1e0f6a7, date: '2026-11-08', change: copyDictionary.cb7134d975ec813fe, reason: copyDictionary.c4e76af57a6a30dd3 },
    { version: copyDictionary.c7e341bd849acec03, date: '2026-11-07', change: copyDictionary.cd5b7f748a2d832bf, reason: copyDictionary.cb65d4b2f4c91b5e8 },
] as const;
export const ABOUT_SOURCE_COUNT = sourceCount;
