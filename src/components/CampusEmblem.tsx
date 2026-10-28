import './campus-emblem.css'

export const campusEmblemSource = 'https://www.seu.edu.cn/p47316c47313/list.psp'

/** Original official artwork, displayed separately from the application's mark. */
export function CampusEmblem() {
  return <a className="campus-emblem" href={campusEmblemSource} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="东南大学校徽，查看官方标识说明">
    <img src="/images/seu-emblem.png" alt="东南大学校徽" width="578" height="578" decoding="async" />
  </a>
}
