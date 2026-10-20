import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppData, ProductAnalysis, Screen, TravelCheckResult, TravelMode } from './types'
export interface AppContextValue {
  data: AppData; setData: Dispatch<SetStateAction<AppData>>; screen: Screen; go: (screen: Screen) => void;
  notify: (text: string) => void; speak: (text: string, rate?: number) => void; reset: () => void;
  product: ProductAnalysis | null; setProduct: (product: ProductAnalysis) => void;
  travel: { mode: TravelMode; results: TravelCheckResult[] };
  setTravel: (travel: { mode: TravelMode; results: TravelCheckResult[] }) => void;
  voiceEntry: boolean; setVoiceEntry: (voice: boolean) => void;
}
export const AppContext = createContext<AppContextValue | null>(null)
export function useApp() { const context = useContext(AppContext); if (!context) throw new Error('AppContext missing'); return context }
