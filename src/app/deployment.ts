import { copyDictionary } from "./copyDictionary.ts";
export const isStudio = import.meta.env.VITE_DEPLOYMENT === 'studio';
export const processingLocation = isStudio ? copyDictionary.cfec92a9097307d41 : copyDictionary.c37a2af4ddf5d8da8;
export const processingNotice = isStudio ? copyDictionary.c9650a764cc27ccab : copyDictionary.c5e215d2b42081dfa;
