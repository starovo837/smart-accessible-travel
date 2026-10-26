import { AppMark } from './UI'
export function FeatureNav({active,onHome,onFitting,onShop,onTravel}:{active:'home'|'fitting'|'shop'|'travel';onHome:()=>void;onFitting:()=>void;onShop:()=>void;onTravel:()=>void}){
 return <header className="feature-header" data-active={active}><button className="feature-brand" onClick={onHome} aria-label="智能无碍行，返回首页"><AppMark/><span>智能无碍行</span></button><nav aria-label="主要功能">{([['home','首页',onHome],['fitting','三维试配',onFitting],['shop','买辅具',onShop],['travel','出行查询',onTravel]] as const).map(([id,label,action])=><button key={id} aria-current={active===id?'page':undefined} onClick={action}>{label}</button>)}</nav></header>
}
