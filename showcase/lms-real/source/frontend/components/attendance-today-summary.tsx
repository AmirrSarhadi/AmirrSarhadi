import {fa} from "@/lib/api";

export type TodayAttendance={date:string;daily:Record<string,number>;excuses:Record<string,number>};
export function AttendanceTodaySummary({summary,loading}:{summary?:TodayAttendance;loading:boolean}){
 return <div className="report-overview" aria-busy={loading}>
  <fieldset className="report-group"><legend>حضور امروز</legend><dl className="report-data">{Object.entries({present:"حاضر",absent:"غایب",late:"تأخیر",early:"خروج زودهنگام"}).map(([status,label])=><div className={'report-stat '+status} key={status}><dt>{label}</dt><dd>{fa(summary?.daily[status]||0)}</dd></div>)}</dl></fieldset>
  <fieldset className="report-group excuse-overview"><legend>وضعیت غیبت‌های امروز</legend><dl className="report-data"><div className="report-stat excused"><dt>موجه</dt><dd>{fa(summary?.excuses.excused||0)}</dd></div><div className="report-stat absent"><dt>غیرموجه</dt><dd>{fa(summary?.excuses.unexcused||0)}</dd></div></dl></fieldset>
 </div>;
}
