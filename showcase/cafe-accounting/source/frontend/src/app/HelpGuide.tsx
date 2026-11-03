import { useState } from "react";
import { SelectField, TextField } from "../shared/ui/controls";
import { guideTopics } from "./helpContent";

function normalize(value: string) {
  return value.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, "").replace(/[\u064b-\u065f]/g, "").toLocaleLowerCase().trim();
}

export function HelpGuide() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const results = guideTopics.filter((entry) => {
    const text = normalize([entry.title, entry.overview, ...entry.steps, ...entry.actions.flat(), ...entry.notes].join(" "));
    return (topic === "all" || topic === entry.id) && terms.every((term) => text.includes(term));
  });
  function reset() { setQuery(""); setTopic("all"); }
  return <section className="help-guide" aria-labelledby="help-title">
    <header className="panel help-guide__header"><h1 id="help-title">راهنمای برنامه</h1></header>
    <div className="panel help-guide__filters">
      <TextField label="جست‌وجو در راهنما" name="help-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً تسویه، ثبت هزینه یا اصلاح موجودی" />
      <SelectField label="بخش برنامه" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="all">همه بخش‌ها</option>{guideTopics.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</SelectField>
      <button type="button" className="button button--secondary" onClick={reset} disabled={!query && topic === "all"}>پاک‌کردن فیلتر</button>
    </div>
    <p className="help-guide__count" role="status">{new Intl.NumberFormat("fa-IR").format(results.length)} موضوع راهنما</p>
    <div className="help-guide__topics">{results.map((entry) => <details className="panel help-topic" key={entry.id} open={terms.length > 0 || topic !== "all" ? true : undefined}>
      <summary><h2>{entry.title}</h2>{entry.management && <span className="role-badge">امکانات مدیریتی</span>}</summary>
      <div className="help-topic__body"><p>{entry.overview}</p>
        <h3>مراحل کار</h3><ol>{entry.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <h3>کاربرد دکمه‌ها و گزینه‌ها</h3><dl className="help-topic__actions">{entry.actions.map(([label, description]) => <div key={label}><dt>{label}</dt><dd>{description}</dd></div>)}</dl>
        <h3>نکته‌های مهم</h3><ul>{entry.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      </div>
    </details>)}</div>
    {!results.length && <div className="panel empty-state"><h2>موضوعی پیدا نشد</h2><p>عبارت کوتاه‌تری بنویسید یا بخش برنامه را تغییر دهید.</p><button type="button" className="button button--secondary" onClick={reset}>نمایش همه راهنماها</button></div>}
  </section>;
}
