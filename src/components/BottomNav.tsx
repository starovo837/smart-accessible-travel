import { Icon } from './Icons'

type MainSection = 'home' | 'living-hub' | 'support' | 'profile'

/** Main sections are peers; closing a tool never opens another section. */
export function BottomNav({ active, onNavigate }: { active: MainSection; onNavigate: (section: MainSection) => void }) {
  return <nav className="support-bottom-nav" aria-label="底部导航">
    {([
      ['home', '首页', 'home'],
      ['living-hub', '生活', 'leaf'],
      ['support', '辅助中心', 'grid'],
      ['profile', '我的', 'user'],
    ] as const).map(([section, label, icon]) => <button key={section} type="button" aria-current={active === section ? 'page' : undefined} onClick={() => onNavigate(section)}><Icon name={icon} />{label}</button>)}
  </nav>
}
