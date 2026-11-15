import { copyDictionary } from "../app/copyDictionary.ts";
import { AppMark } from './UI';
import { CampusEmblem } from './CampusEmblem';
export function FeatureNav({ active, onHome, onFitting, onShop, onTravel }: {
    active: 'home' | 'fitting' | 'shop' | 'travel';
    onHome: () => void;
    onFitting: () => void;
    onShop: () => void;
    onTravel: () => void;
}) {
    return <header className="feature-header" data-active={active}><div className="feature-identity"><button className="feature-brand" onClick={onHome} aria-label={copyDictionary.ca2c0270b2549aed5}><AppMark /><span>{copyDictionary.c4ec7c5b9618b5554}</span></button><CampusEmblem /></div><nav aria-label={copyDictionary.cfd9dffb4436b32e1}>{([['home', copyDictionary.c203c08e0d44ac375, onHome], ['fitting', copyDictionary.cbfc50e32f27a32dc, onFitting], ['shop', copyDictionary.c4a98f083f7fe73b2, onShop], ['travel', copyDictionary.c6e7604f9408c6b81, onTravel]] as const).map(([id, label, action]) => <button key={id} aria-current={active === id ? 'page' : undefined} onClick={action}>{label}</button>)}</nav></header>;
}
