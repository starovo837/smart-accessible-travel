import { copyDictionary } from "../app/copyDictionary.ts";
import { PageHeader } from '../components/UI';
import { aboutSections, updateHistory } from '../app/about';
import '../about.css';
export function AboutPage({ onBack }: {
    onBack: () => void;
}) {
    return <section className="screen about-screen">
    <PageHeader title={copyDictionary.c0ed77920b1cd8737} subtitle={copyDictionary.c71a909f3f7e60e55} onBack={onBack}/>
    <div className="about-sections">
      {aboutSections.map(section => <section className="about-block" key={section.id} aria-labelledby={'about-' + section.id}>
        <h2 id={'about-' + section.id}>{section.title}</h2>
        <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>
        {section.id === 'version' && <details className="about-updates"><summary>{copyDictionary.cf1e544300912117d}</summary><ol>{updateHistory.map(item => <li key={item.version}><strong>{item.version} · {item.date}</strong><span>{item.change}{copyDictionary.c4f24a97446f1a2db}{item.reason}。</span></li>)}</ol></details>}
      </section>)}
    </div>
  </section>;
}
