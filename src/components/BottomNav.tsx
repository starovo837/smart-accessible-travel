import { copyDictionary } from "../app/copyDictionary.ts";
import { Icon } from './Icons';
type MainSection = 'home' | 'living-hub' | 'support' | 'profile';
/** Main sections are peers; closing a tool never opens another section. */
export function BottomNav({ active, onNavigate }: {
    active: MainSection;
    onNavigate: (section: MainSection) => void;
}) {
    return <nav className="support-bottom-nav" aria-label={copyDictionary.c0053b10bb55a8878}>
    {([
            ['home', copyDictionary.c203c08e0d44ac375, 'home'],
            ['living-hub', copyDictionary.c15d208d1b4c98aae, 'leaf'],
            ['support', copyDictionary.c2513de5209c2a1a7, 'grid'],
            ['profile', copyDictionary.c7f1d9dd04cd1c7b8, 'user'],
        ] as const).map(([section, label, icon]) => <button key={section} type="button" aria-current={active === section ? 'page' : undefined} onClick={() => onNavigate(section)}><Icon name={icon}/>{label}</button>)}
  </nav>;
}
