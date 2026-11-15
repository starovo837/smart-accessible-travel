import { copyDictionary } from "./copyDictionary.ts";
export type EncouragementContext = 'home' | 'support' | 'services' | 'hospital' | 'scene' | 'fitting' | 'shopping' | 'travel' | 'daily' | 'assistant' | 'profile';
/** General, non-clinical copy. No profile or personal record is used to choose a message. */
export const encouragementMessages: Record<EncouragementContext, readonly string[]> = {
    home: [
        copyDictionary.c0fa14323ddb7f2c9,
        copyDictionary.c15d8c8c9fb1288eb,
        copyDictionary.c46b1cbbd41d93b40,
        copyDictionary.c90202b0da76d3965,
        copyDictionary.c2564dbf969a28be0,
        copyDictionary.cf1e0d68cee54d87f,
        copyDictionary.c86117df226ba3b89,
        copyDictionary.cf84c849742ec47f3,
    ],
    support: [
        copyDictionary.c2593dcbce6085df1,
        copyDictionary.c7a856c2cb033fc8d,
        copyDictionary.cde6b7972e22dc924,
        copyDictionary.cf5806e2bfcdb2f44,
        copyDictionary.cfd0a5fa42332de19,
        copyDictionary.c348ab3169d9b1820,
        copyDictionary.c26a16808b66e47b4,
        copyDictionary.cf045cc550ed3fe6f,
    ],
    services: [
        copyDictionary.c2375b36575cbd9d6,
        copyDictionary.cdf90c744f3c3178c,
        copyDictionary.c68d64a0da65f4c59,
        copyDictionary.c1f1123c441fb39ee,
        copyDictionary.cf98098b1f4891f1d,
        copyDictionary.c11b75ba36b840785,
        copyDictionary.c84469689e4666b97,
        copyDictionary.c33e2e74e82ec8732,
    ],
    hospital: [
        copyDictionary.c301e1ed4171e4514,
        copyDictionary.c2db7ba182fc8c90d,
        copyDictionary.c676b807061c25268,
        copyDictionary.c39387d209945efd1,
        copyDictionary.ce0d193df19b8b07a,
        copyDictionary.cdad0e0adc08b0dd5,
        copyDictionary.ccb68df8bdc7f198f,
        copyDictionary.cc730326a146aa0b2,
    ],
    scene: [
        copyDictionary.c7731bafa46091148,
        copyDictionary.c65e5df227d602712,
        copyDictionary.c80d571ed0766b799,
        copyDictionary.c94a0a4078dce460c,
        copyDictionary.c3babba0e9486b3ce,
        copyDictionary.c8c90d6e3d77b9775,
        copyDictionary.cb69bf19c20466879,
        copyDictionary.c4f962c4bc33f7376,
    ],
    fitting: [
        copyDictionary.c02ad4068c9cf30cf,
        copyDictionary.c82001ddb418d5490,
        copyDictionary.c4d743c18677f7f21,
        copyDictionary.c3e8b2e12a0a8bd1d,
        copyDictionary.c1cb05f815fc5c65b,
        copyDictionary.c0a35dfc9ffd7821f,
        copyDictionary.c8d3ba39363f2293e,
        copyDictionary.c09056e1fb452fd5b,
    ],
    shopping: [
        copyDictionary.c57f3311780414594,
        copyDictionary.c6d9e31dd15a7ca55,
        copyDictionary.cbf93395527e71b4f,
        copyDictionary.cbd15be80992d3762,
        copyDictionary.cd02dcd57fe3e2f79,
        copyDictionary.c4d13d9d0948de2fc,
        copyDictionary.cae12814dede50f58,
        copyDictionary.c9e61de346fb4391a,
    ],
    travel: [
        copyDictionary.c61d0475d00c6ef0f,
        copyDictionary.ca6f99c935e2a9c4c,
        copyDictionary.c011085bb73a09282,
        copyDictionary.c1f39302fef079d56,
        copyDictionary.c4b49e035e69be870,
        copyDictionary.c555a5f3623e97a7b,
        copyDictionary.cddc868135b766f75,
        copyDictionary.cf85a4502c6465c35,
    ],
    daily: [
        copyDictionary.ce7abf69798b3ffd8,
        copyDictionary.cd68d6e3ba1d77dc4,
        copyDictionary.c3685e7165282fa1c,
        copyDictionary.cae0eb7c6684e7897,
        copyDictionary.ca99e2244548f0bcc,
        copyDictionary.c96c411ce3cb50d19,
        copyDictionary.ce67bb234c4a96d0f,
        copyDictionary.c815e0861aeabf015,
    ],
    assistant: [
        copyDictionary.c9cd3db79f304eef0,
        copyDictionary.c5f72b58a79da91c7,
        copyDictionary.c07ae4737bd1c6a9d,
        copyDictionary.ca337bb99128cc23d,
        copyDictionary.ca640e9181ef3e01b,
        copyDictionary.c315ffbd702330ed5,
        copyDictionary.cd17782843819c988,
        copyDictionary.c2490a5169e01444c,
    ],
    profile: [
        copyDictionary.cda70851098c9721d,
        copyDictionary.c3b4c665d799a345d,
        copyDictionary.cc98af4310f23f8cd,
        copyDictionary.cf41c15b2391c51e2,
        copyDictionary.cbda2cc8739d90195,
        copyDictionary.c1cf979d5ca438fa4,
        copyDictionary.c4b9b95ddbd6cb43f,
        copyDictionary.c291eae39810a9068,
    ],
};
const contexts = Object.keys(encouragementMessages) as EncouragementContext[];
/** Every supported context has a note; the date is only a repeatable starting point. */
export function selectEncouragement(context: EncouragementContext, date: Date = new Date(), variation = 0): string | null {
    if (!Number.isFinite(date.getTime()) || !Number.isSafeInteger(variation))
        return null;
    const choices = encouragementMessages[context];
    if (!choices)
        return null;
    const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    const index = day + contexts.indexOf(context) * 3 + variation;
    return choices[((index % choices.length) + choices.length) % choices.length];
}
/** In-memory rotation, without storage, profile access, timers, or automatic announcements. */
export function createEncouragementCycle() {
    const previous = new Map<EncouragementContext, string>();
    return (context: EncouragementContext, date: Date = new Date()): string | null => {
        const first = selectEncouragement(context, date);
        if (!first)
            return null;
        const choices = encouragementMessages[context];
        const last = previous.get(context);
        const message = last ? choices[(choices.indexOf(last) + 1) % choices.length] : first;
        previous.set(context, message);
        return message;
    };
}
export const nextEncouragement = createEncouragementCycle();
