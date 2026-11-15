import { copyDictionary } from "./copyDictionary.ts";
export const conflictCopy={title:copyDictionary.conflictTitle,process:copyDictionary.conflictProcess,channel:copyDictionary.conflictChannel,instruction:copyDictionary.conflictInstruction,because:copyDictionary.conflictBecause,notApplicable:copyDictionary.conflictNotApplicable,ask:copyDictionary.conflictAsk}
/** User-facing labels; evidence enum values stay private. */
export const uiCopy = {
    evidence: {
        'official-rule': copyDictionary.cbbdc8d27df449a98,
        'official-excerpt': copyDictionary.cb74c8add46ae74a9,
        user: copyDictionary.c91807e5563b903c8,
        inference: copyDictionary.cf0ffa47a82dc7095,
    },
    recorded: copyDictionary.c4d4b990c0fe60013,
    common: copyDictionary.ce4c43faf5e50f124,
    verify: copyDictionary.c857f0cf79d417f06,
    completion: (done: number, total: number) => copyDictionary.cc2a70c4f75c6a236 + done + copyDictionary.c8a5edab282632443 + total + copyDictionary.ca2ecf815b7fb6f3e,
    missing: (count: number) => copyDictionary.c6937b5b1991f5ef4 + count + copyDictionary.cda8bf16e43642402,
    onsite: copyDictionary.c3d71af0d4cfb47d9,
    readAll: copyDictionary.c5f7baddce5e202df,
} as const;
