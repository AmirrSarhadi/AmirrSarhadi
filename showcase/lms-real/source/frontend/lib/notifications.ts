export type NotificationTarget={section:string;classroom_id?:number;period_id?:number;teaching_id?:number};
export type NotificationRow={id:number;title:string;body:string;link:string;target?:NotificationTarget;read:boolean;created_at:string};
export const notificationsChanged=()=>window.dispatchEvent(new Event("panel-notifications-changed"));
const sections=new Set(["home","attendance-report","classes","structure","academic-reports","student-files","attendance","staff-attendance","absences","discipline","monthly-reports","grade-corrections","assignments","exams","communications","announcements","timetable","notifications"]);
export function notificationTarget(row:NotificationRow):NotificationTarget|null{
 const value=row.target?.section||row.link,section=value==="evaluations"?"academic-reports":value;
 if(!sections.has(section))return null;
 return {...row.target,section};
}
