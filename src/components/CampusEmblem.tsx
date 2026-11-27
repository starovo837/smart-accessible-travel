import { copyDictionary } from "../app/copyDictionary.ts";
import { assetUrl } from '../app/assetUrl';
import './campus-emblem.css';
export const campusEmblemSource = 'https://www.seu.edu.cn/p47316c47313/list.psp';
/** Original official artwork, displayed separately from the application's mark. */
export function CampusEmblem() {
    return <a className="campus-emblem" href={campusEmblemSource} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={copyDictionary.ca15a5b666682ee27}>
    <img src={assetUrl('images/seu-emblem.png')} alt={copyDictionary.c7f09d810d720ffd6} width="578" height="578" decoding="async"/>
  </a>;
}
