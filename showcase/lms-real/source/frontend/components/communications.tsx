"use client";
import {ClassContext} from "@/lib/class-context";
import {promptAction,notifyPanel} from "@/lib/panel-feedback";
import {FileUpload} from "@/components/ui/file-upload-04";
import {FormEvent,useEffect,useLayoutEffect,useRef,useState} from "react";
import {ArrowUp,FileDown,History,MessageCircle,Plus,RefreshCw,Send,Trash2,Users} from "lucide-react";
import {api,send,fa,dateFa} from "@/lib/api";

type Recipient={id:number;name:string;role:string;role_label:string};
type Options={recipients:Recipient[];classrooms:{id:number;label:string}[];can_create_group:boolean};
type Member={id:number;name:string;role:string};
type Conversation={id:number;kind:string;title:string;classroom:string;classroom_id?:number;audience:string;unread:number;members:Member[];last_message:null|{id:number;sender:string;body:string;created_at:string;version?:number}};
type Message={id:number;sender_id:number;sender:string;body:string;created_at:string;edited_at:string|null;deleted:boolean;version:number;attachment:null|{name:string;size:number;url:string};can_modify:boolean;can_view_history:boolean};
type MessageResult={conversation:Conversation;records:Message[];has_more:boolean};
const timeFa=(value:string)=>new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Tehran"}).format(new Date(value));

export function CommunicationsPanel({role,userId,onRead,classContext}:{role:string;userId:number;onRead:()=>Promise<void>;classContext?:ClassContext}){
 const [options,setOptions]=useState<Options>({recipients:[],classrooms:[],can_create_group:false}),[rows,setRows]=useState<Conversation[]>([]),[selected,setSelected]=useState(0),[messages,setMessages]=useState<Message[]>([]),[create,setCreate]=useState<""|"direct"|"group">(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function load(){setLoading(true);setError("");try{const [o,c]=await Promise.all([api<Options>("/communications/options/"),api<Conversation[]>("/communications/conversations/")]);setOptions(classContext?{...o,classrooms:o.classrooms.filter(row=>row.id===classContext.id)}:o);const visible=classContext?c.filter(row=>row.kind==="group"&&row.classroom_id===classContext.id):c;setRows(visible);setSelected(id=>visible.some(row=>row.id===id)?id:visible[0]?.id||0)}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 const [hasMore,setHasMore]=useState(false),[messageBusy,setMessageBusy]=useState(false),[messageError,setMessageError]=useState(""),[failedOlder,setFailedOlder]=useState(false);
 const selection=useRef(selected),request=useRef(0),pending=useRef(false),stream=useRef<HTMLDivElement>(null),anchor=useRef<{id:number;top:number}|null>(null);
 selection.current=selected;
 useLayoutEffect(()=>{const saved=anchor.current;if(!saved)return;anchor.current=null;const node=stream.current?.querySelector<HTMLElement>(`[data-message-id="${saved.id}"]`);if(node&&stream.current)stream.current.scrollTop+=node.getBoundingClientRect().top-saved.top},[messages]);
 async function loadMessages(id=selected,older=false,reset=false){
  if(!id||id!==selection.current||(older&&pending.current))return;
  const ticket=++request.current,cursor=older?messages[0]?.id:undefined;
  if(older&&!cursor)return;
  const oldest=older?stream.current?.querySelector<HTMLElement>(`[data-message-id="${cursor}"]`):null;
  const oldestTop=oldest?.getBoundingClientRect().top;
  pending.current=true;setMessageBusy(true);setMessageError("");setFailedOlder(older);
  try{
   const result=await api<MessageResult>(`/communications/conversations/${id}/messages/${cursor?`?before=${cursor}`:""}`);
   if(ticket!==request.current||id!==selection.current)return;
   if(older&&oldestTop!==undefined)anchor.current={id:cursor!,top:oldestTop};
   setMessages(old=>{const merged=new Map(old.map(row=>[row.id,row]));for(const row of result.records){if((merged.get(row.id)?.version||0)<=row.version)merged.set(row.id,row)}return [...merged.values()].sort((a,b)=>a.id-b.id)});
   if(older||reset||!messages.length)setHasMore(result.has_more);
   setRows(old=>old.map(x=>x.id===id?{...result.conversation,unread:0}:x));
   if(!older)await onRead();
  }catch(e){if(ticket===request.current&&id===selection.current)setMessageError((e as Error).message)}finally{if(ticket===request.current&&id===selection.current){pending.current=false;setMessageBusy(false)}}
 }
 useEffect(()=>{load()},[]);
 useEffect(()=>{setMessages([]);setHasMore(false);setMessageError("");pending.current=false;setMessageBusy(false);anchor.current=null;if(selected)loadMessages(selected,false,true);return()=>{request.current++;pending.current=false}},[selected]);
 async function act(fn:()=>Promise<void>,message:string){setBusy(true);setError("");setSuccess("");try{await fn();setSuccess(message)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const active=rows.find(x=>x.id===selected),observer=Boolean(active&&!active.members.some(x=>x.id===userId));
 async function createConversation(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,d=new FormData(form);await act(async()=>{const row=await send<Conversation>("/communications/conversations/",create==="direct"?{kind:"direct",recipient_id:Number(d.get("recipient"))}:{kind:"group",classroom_id:Number(d.get("classroom")),audience:d.get("audience"),title:d.get("title")});setCreate("");await load();setSelected(row.id)},create==="direct"?"گفت‌وگوی مستقیم آماده شد.":"گروه ساخته شد.")}
 async function submitMessage(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,d=new FormData(form);const file=form.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];if(!String(d.get("body")||"").trim()&&!file){setError("متن یا فایل پیام را وارد کنید.");return}if(!file)d.delete("attachment");await act(async()=>{await api(`/communications/conversations/${selected}/messages/`,{method:"POST",body:d});form.reset();await Promise.all([loadMessages(),load()])},"پیام ارسال شد.")}
 async function updateMessage(row:Message,action:"edit"|"delete",body?:string){
  const id=selected;const updated=await send<Message>(`/messages/${row.id}/`,{action,body,expected_version:row.version});
  if(selection.current!==id)return;
  setMessages(old=>old.map(item=>item.id===updated.id&&item.version<=updated.version?updated:item));
  setRows(old=>old.map(item=>item.id===id&&item.last_message?.id===updated.id&&(item.last_message.version||0)<=updated.version?{...item,last_message:{id:updated.id,sender:updated.sender,body:updated.body,created_at:updated.created_at,version:updated.version}}:item));
 }
 async function editMessage(row:Message){const body=await promptAction("متن ویرایش‌شده پیام:",row.body);if(body===null)return;await act(()=>updateMessage(row,"edit",body),"پیام ویرایش شد؛ نسخه قبلی برای مدیر محفوظ است.")}
 async function removeMessage(row:Message){await act(()=>updateMessage(row,"delete"),"پیام حذف شد.")}
 return <div className="communications-module">
  <section className="card communications-intro"><div><span className="badge">ارتباط امن مدرسه</span><h2>پیام‌ها و گروه‌های کلاسی</h2><p>گفت‌وگوها بر اساس نقش و کلاس محدودند؛ فایل‌ها عمومی نیستند.</p></div><MessageCircle/></section>
  {error&&<div className="error" role="alert">{error}</div>}{success&&<div className="success" role="status">{success}</div>}
  <div className="communications-actions">{!classContext&&<button className="button small" onClick={()=>setCreate("direct")} disabled={busy||!options.recipients.length}><Plus size={15}/>گفت‌وگوی مستقیم</button>}{options.can_create_group&&<button className="button outline small" onClick={()=>setCreate("group")} disabled={busy||!options.classrooms.length}><Users size={15}/>گروه کلاسی</button>}<button className="text-link" onClick={load} disabled={busy||loading}><RefreshCw size={15}/>تازه‌سازی</button></div>
  {create&&<section className="card conversation-create"><form onSubmit={createConversation}><h3>{create==="direct"?"شروع گفت‌وگوی مستقیم":"ساخت گروه کلاسی"}</h3>{create==="direct"?<label>مخاطب<select name="recipient" required>{options.recipients.map(x=><option key={x.id} value={x.id}>{x.name} · {x.role_label}</option>)}</select></label>:<div className="form-grid"><label>عنوان گروه<input name="title" required maxLength={180}/></label><label>کلاس<select name="classroom" required>{options.classrooms.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label><label>اعضا<select name="audience"><option value="student">فقط دانش‌آموزان کلاس</option><option value="family">فقط خانواده‌های کلاس</option></select></label></div>}<div className="communications-actions"><button className="button small" disabled={busy}>ایجاد</button><button type="button" className="button outline small" onClick={()=>setCreate("")}>انصراف</button></div></form></section>}
  <section className="communications-layout">
   <aside className="card conversation-list">{loading?<p>در حال دریافت…</p>:!rows.length?<p className="muted">هنوز گفت‌وگویی وجود ندارد.</p>:rows.map(row=><button key={row.id} className={selected===row.id?"active":""} onClick={()=>setSelected(row.id)}><span><b>{row.title}</b><small>{row.kind==="group"?(row.audience==="family"?"گروه خانواده‌ها":"گروه دانش‌آموزان"):(row.last_message?.body||"گفت‌وگوی مستقیم")}</small></span>{row.unread>0&&<em>{fa(row.unread)}</em>}</button>)}</aside>
   <div className="card conversation-thread">{!active?<div className="empty-state">یک گفت‌وگو را انتخاب کنید.</div>:<><header><div><h3>{active.title}</h3><p>{active.kind==="group"?`${active.classroom} · ${fa(active.members.length)} عضو`:active.members.map(x=>x.name).join("، ")}</p></div><button className="text-link" disabled={messageBusy} onClick={()=>loadMessages()}><RefreshCw size={15}/>تازه‌سازی</button></header>{observer&&<p className="notice">نمایش نظارتی مدیر؛ ارسال پیام در گفت‌وگویی که عضو آن نیستید مجاز نیست.</p>}<div className="message-stream" ref={stream} aria-busy={messageBusy} style={{overflowAnchor:"none"}}>{hasMore&&<button className="text-link" disabled={messageBusy} onClick={()=>loadMessages(selected,true)}><ArrowUp size={15}/>پیام‌های قدیمی‌تر</button>}{messageBusy&&<p role="status" className="muted">در حال دریافت…</p>}{messageError&&<div className="error" role="alert">{messageError}<button className="text-link" disabled={messageBusy} onClick={()=>loadMessages(selected,failedOlder)}><RefreshCw size={15}/>تلاش دوباره</button></div>}{!messages.length&&!messageBusy&&!messageError?<p className="muted">هنوز پیامی ارسال نشده است.</p>:messages.map(row=><article data-message-id={row.id} className={row.sender_id===userId?"message-bubble mine":"message-bubble"} key={row.id}><div><b>{row.sender}</b><time>{timeFa(row.created_at)}</time></div>{row.deleted?<p className="muted">این پیام حذف شده است.</p>:<><p>{row.body}</p>{row.attachment&&<a className="message-file" href={row.attachment.url} download={row.attachment.name}><FileDown size={15}/>{row.attachment.name} · {fa(Math.ceil(row.attachment.size/1024))} کیلوبایت</a>}</>}{row.edited_at&&!row.deleted&&<small>ویرایش‌شده</small>}<div className="message-tools">{row.can_modify&&<><button onClick={()=>editMessage(row)}>ویرایش</button><button onClick={()=>removeMessage(row)}><Trash2 size={13}/>حذف</button></>}{row.can_view_history&&<MessageHistory messageId={row.id}/>}</div></article>)}</div>{!observer&&<form className="message-compose" onSubmit={submitMessage}><label>پیام<textarea name="body" maxLength={5000} rows={3} placeholder="متن پیام…"/></label><FileUpload title="پیوست پیام" hint="PDF تا ۵ مگابایت" name="attachment" accept=".pdf,application/pdf" maxSize={5*1024*1024} disabled={busy}/><button className="button small" disabled={busy}><Send size={15}/>ارسال</button></form>}</>}</div>
  </section>
 </div>;
}

function MessageHistory({messageId}:{messageId:number}){const [open,setOpen]=useState(false),[rows,setRows]=useState<{version:number;body:string;action:string;actor:string;created_at:string}[]>([]);async function toggle(){if(!open&&!rows.length)setRows(await api(`/messages/${messageId}/history/`));setOpen(!open)}return <div className="message-history"><button onClick={()=>toggle().catch(e=>notifyPanel({kind:"error",message:e.message}))}><History size={13}/>سابقه</button>{open&&<ul>{rows.map(x=><li key={x.version}><b>نسخه {fa(x.version)} · {x.action==="delete"?"پیش از حذف":"پیش از ویرایش"}</b><span>{x.body||"پیام فایلی"}</span><small>{x.actor} · {dateFa(x.created_at)}</small></li>)}</ul>}</div>}
