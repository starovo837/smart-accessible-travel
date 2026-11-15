import { copyDictionary } from "./copyDictionary.ts";
import type { DisabilityCategory } from './disabilityProfile';
/** Authored advice, never represented as a carrier's safety approval. */
export const categoryAdvice: Record<DisabilityCategory, readonly [
    string,
    string
][]> = {
    vision: [
        [copyDictionary.c231a9ff757967b8b, copyDictionary.c2b8596367fe5099c],
        [copyDictionary.cb861f853b9617d50, copyDictionary.ca71d59ff4061771b],
        [copyDictionary.c2cd9182a9f2c2a15, copyDictionary.cf687cdc9e5010b72],
        [copyDictionary.c3581807cd1f02389, copyDictionary.cdd23d47cd62c1d2d],
        [copyDictionary.c8682e85da231331d, copyDictionary.c84333eafd549ffed],
        [copyDictionary.c6e4be997d509104d, copyDictionary.c748c4d9efa352eba],
        [copyDictionary.c0c0539723e32373f, copyDictionary.c7e1adaddda671ccd],
        [copyDictionary.ce068de0dfd159dd8, copyDictionary.cf53775cdb6bf7ded],
        [copyDictionary.c6fa0cb5f85c90217, copyDictionary.c5e846bb523d2895c],
        [copyDictionary.c94f8029c6d81c86a, copyDictionary.c73c943b794e0ca61],
    ],
    hearing: [
        [copyDictionary.c7838b7f0e900498b, copyDictionary.ceef505d84eb03aa9],
        [copyDictionary.c2314c33040b2b530, copyDictionary.c621dcd4fc6a17304],
        [copyDictionary.c59234f20a3bfc6e8, copyDictionary.c3c9e12a06c6f36fe],
        [copyDictionary.c6271e33dac6747a4, copyDictionary.c019c1874f6ee57c3],
        [copyDictionary.c28a427bb63168705, copyDictionary.cc8d2dd57ed0b01ac],
        [copyDictionary.c466580edcbbe9dd3, copyDictionary.c30c8a152afa1238d],
        [copyDictionary.c4c512b5c6c34a14e, copyDictionary.c2b65b0f6559bef52],
        [copyDictionary.cdcbaf284f200ee7b, copyDictionary.cf97c756e382bb208],
        [copyDictionary.c1c3cb6f8d94a2843, copyDictionary.c343016d5192e1d80],
        [copyDictionary.c4b6cfadb96d396da, copyDictionary.c15586efa420c3dd5],
    ],
    speech: [
        [copyDictionary.c33eb24d8cd03a550, copyDictionary.c2a8e30887bab0144],
        [copyDictionary.ccc92033c9b84c405, copyDictionary.cf3ecdfba2167c94e],
        [copyDictionary.cb49307d1ac6ccfb1, copyDictionary.c86199d15d1ac8662],
        [copyDictionary.c696678ba42d3b93d, copyDictionary.c1cd6d73aff5e57fa],
        [copyDictionary.c0e437d196fbdaae4, copyDictionary.c2f51d6d543092e2b],
        [copyDictionary.c3f84ab4ddf20863b, copyDictionary.cc5e5cddde08bb052],
        [copyDictionary.cda3f5db55981a912, copyDictionary.c4dad123bba400ce4],
        [copyDictionary.c345f8f7b75399e03, copyDictionary.c3f2146916b257c46],
        [copyDictionary.c4a7f5a4d0cd944ec, copyDictionary.c364cb5d568250fa4],
        [copyDictionary.c3db8435eb0c92255, copyDictionary.ce582025cc4e43bb2],
    ],
    physical: [
        [copyDictionary.caa231d04e826e076, copyDictionary.c2eaeec61b28b280d],
        [copyDictionary.cd3e35ac8fd50e102, copyDictionary.c835bc886480d48c6],
        [copyDictionary.c21cdc06f61307431, copyDictionary.cbdedefad25519cb2],
        [copyDictionary.cd4718659a93b9500, copyDictionary.c9cc6e03c8f599ff6],
        [copyDictionary.cbe0675a3fee73bf4, copyDictionary.c3b7135602ebd56cf],
        [copyDictionary.c1ffe86790c201a23, copyDictionary.c423ef301a1e5e67c],
        [copyDictionary.ca0fbb4c9f93ec7ef, copyDictionary.c3fee30240bf0be1b],
        [copyDictionary.cc1dde0c442c5151e, copyDictionary.c823b6e1cdc13f259],
        [copyDictionary.c4f2ccc3221340ce6, copyDictionary.c55df5b07b66e1706],
        [copyDictionary.c1b2db41254cacfde, copyDictionary.c955aceb417dcb51e],
    ],
    intellectual: [
        [copyDictionary.cec65f8807f1cb374, copyDictionary.ca23b771a6187d890],
        [copyDictionary.cfe5d8b83a67ef819, copyDictionary.cd53515a6485f94b6],
        [copyDictionary.c217ec8b2a9685ef9, copyDictionary.c5a0e6b768f66920f],
        [copyDictionary.cb2067420eb77c21d, copyDictionary.c859854a230b2f4bd],
        [copyDictionary.c0f3f89d8c4e61bb9, copyDictionary.ccfdec165af728c15],
        [copyDictionary.c7658d295e60dd2dd, copyDictionary.c73ce3b99d3a61397],
        [copyDictionary.c07a644a738551f67, copyDictionary.c66c2bb38a970e3fa],
        [copyDictionary.c6a5f30eb633a4ffd, copyDictionary.c9cf5d54a4137881f],
        [copyDictionary.cf1e4991d69094519, copyDictionary.cc950c458315fbf05],
        [copyDictionary.c90ae38491a4aa123, copyDictionary.c051cbdfcde24a593],
    ],
    mental: [
        [copyDictionary.c3d35f62335e6d519, copyDictionary.c4dc4e00c0e127a77],
        [copyDictionary.ce8c8275a435d2e5f, copyDictionary.c3f96417ecdc50c69],
        [copyDictionary.ca9ea98106e9961d4, copyDictionary.c64217715b39ecc90],
        [copyDictionary.c7d666c31323caf59, copyDictionary.c2992ff6ffd93c2f8],
        [copyDictionary.c2ec21181912c7af3, copyDictionary.c8bab436b92425844],
        [copyDictionary.cf8dc77e57f03fb22, copyDictionary.c83a9357fe45152fc],
        [copyDictionary.c8412d5b792c16268, copyDictionary.c6c5958d4cfb5f629],
        [copyDictionary.cd21a906985150d81, copyDictionary.ca3c5287cadf4b0dc],
        [copyDictionary.c92b8008db0cb385e, copyDictionary.c42ad480ecf91b9c0],
        [copyDictionary.cc8bdec57a15e2a63, copyDictionary.c636ea3aa4cdb15c7],
    ],
};
export const combinationAdvice = [
    { categories: ['vision', 'hearing'], conflict: 'channel', items: [[copyDictionary.cb9da6e25fc5161e1, copyDictionary.c80005a6075b3ba17], [copyDictionary.c350eeef446df3155, copyDictionary.ca2f1a61602eb5373]] },
    { categories: ['vision', 'physical'], conflict: 'instruction', items: [[copyDictionary.c85caf1f1f7142ea1, copyDictionary.c473beea59c9d3390], [copyDictionary.cc72deb97587a10d7, copyDictionary.c1c854d0d653fcecd]] },
    { categories: ['hearing', 'speech'], conflict: 'channel', items: [[copyDictionary.ca1daecff458c6899, copyDictionary.c40bc740d96bffb24], [copyDictionary.c5199a45f23a88f4a, copyDictionary.c90030cc2957c6a3b]] },
    { categories: ['physical', 'intellectual'], conflict: 'process', items: [[copyDictionary.cf325f3e2f7fc6c66, copyDictionary.ce3b273d96c948b6e], [copyDictionary.c197eeb80e97fa3cf, copyDictionary.c094ed1ef31a9418a]] },
    { categories: ['physical', 'mental'], conflict: 'process', items: [[copyDictionary.c5d4b898587838e33, copyDictionary.c112ba6cbe2f43214], [copyDictionary.c06e47160421860a6, copyDictionary.cf297d8e1dfbf26e7]] },
    { categories: ['vision', 'hearing', 'physical'], conflict: 'instruction', items: [[copyDictionary.cd97cf933b555e5fa, copyDictionary.cd911291170401318], [copyDictionary.cc56746c09d733344, copyDictionary.cedd0429c9a6c8af5]] },
] as const;
export const disabilityNotice = copyDictionary.c2d419d8d63726ee5;
export const deafblindAdvice: readonly [
    string,
    string
][] = [
    [copyDictionary.c6159673fc6b3d50f, copyDictionary.c695dc4ddd138a8f8],
    [copyDictionary.c38cd3c1f89195e4c, copyDictionary.cd7ba33022940110d],
    [copyDictionary.c19b65e25ac32d0b1, copyDictionary.c6799373632708f99],
    [copyDictionary.c3c3d1f8c6644bbb3, copyDictionary.cc2e94c4abf031091],
    [copyDictionary.cb07366addf6e2e80, copyDictionary.c9d21e226f77b0b43],
    [copyDictionary.cd5e684136557f917, copyDictionary.ce1b09892d7bf2c72],
    [copyDictionary.c5e61714159c84122, copyDictionary.c752fa2d0e798dd34],
    [copyDictionary.cd4bc2a9aaf1a954d, copyDictionary.c739e542d8bda7321],
    [copyDictionary.cf5c4ca725efbc18e, copyDictionary.c17902d6c888a9b89],
    [copyDictionary.c0305413cd6df9c4f, copyDictionary.cff3e9297ed7c1129],
];
