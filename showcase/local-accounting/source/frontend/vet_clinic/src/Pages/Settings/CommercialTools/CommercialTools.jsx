import InitialMasterForm from "./InitialMasterForm";
import { useEffect, useState } from 'react';
import { API_BASE_URL, authFetch } from '../../../api/http';
import { downloadAuthenticated } from '../../../utils/download';
import { PageHero, DataPanel, PrimaryButton, SecondaryButton } from '../../../components/ERP/ERP';
import styles from './CommercialTools.module.css';
const base = `${API_BASE_URL}/settings/api/v2`;

export default function CommercialTools() {
    const [kind, setKind] = useState('customers');
    const [file, setFile] = useState(null);
    const [validated, setValidated] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [backups, setBackups] = useState([]);
    const [error, setError] = useState('');
    const [integrity, setIntegrity] = useState(null);
    async function loadBackups() {
        const response = await authFetch(`${base}/backups/`);
        if (!response.ok) throw new Error('فهرست پشتیبان‌ها دریافت نشد.');
        setBackups(await response.json());
    }
    useEffect(() => { loadBackups().catch(e => setError(e.message)); }, []);
    async function run(action) {
        setBusy(true); setError(''); setMessage('');
        try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function upload(commit) {
        if (!file) throw new Error('فایل اطلاعات را انتخاب کنید.');
        const data = new FormData();
        data.append('kind', kind); data.append('file', file); data.append('commit', String(commit));
        const response = await authFetch(`${base}/master-import/`, { method: 'POST', body: data });
        const result = await response.json();
        if (!response.ok) {
            setValidated(false);
            const rows = result.rows || [];
            throw new Error(rows.length ? rows.map(row => `ردیف ${row.row}: ${JSON.stringify(row.detail)}`).join('\n') : JSON.stringify(result.detail || result));
        }
        setValidated(!commit);
        setMessage(commit ? `${result.rows} ردیف ثبت شد.` : `${result.rows} ردیف معتبر است؛ هنوز اطلاعاتی ثبت نشده است.`);
    }
    return <div className={styles.page}><PageHero title="ابزارهای تجاری" description="ورود اطلاعات اولیه و نگهداری نسخه‌های پشتیبان" />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p role="status" aria-live="polite">{message}</p>
        <DataPanel title="ورود اطلاعات از Excel و CSV" description="ابتدا قالب را دریافت و تکمیل کنید. ثبت اطلاعات پس از بررسی انجام می‌شود؛ وجود خطا مانع ثبت کل فایل است.">
            <div className={styles.form}>
                <label>نوع اطلاعات<select value={kind} disabled={busy} onChange={e => { setKind(e.target.value); setValidated(false); }}><option value="customers">مشتریان</option><option value="vendors">تأمین‌کنندگان</option><option value="materials">کالاها</option></select></label>
                <label>فایل اطلاعات<input type="file" accept=".csv,.xlsx" disabled={busy} onChange={e => { setFile(e.target.files[0] || null); setValidated(false); }} /></label>
                <SecondaryButton disabled={busy} onClick={() => run(() => downloadAuthenticated(`${base}/master-import/?kind=${kind}`, `${kind}-template.csv`))}>دریافت قالب</SecondaryButton>
                <SecondaryButton disabled={busy || !file} onClick={() => run(() => upload(false))}>بررسی فایل</SecondaryButton>
                <PrimaryButton disabled={busy || !validated} onClick={() => run(() => upload(true))}>{busy ? 'در حال انجام...' : 'ثبت اطلاعات بررسی‌شده'}</PrimaryButton>
            </div>
        </DataPanel>
        <InitialMasterForm />
        <DataPanel title="کنترل تطبیق اطلاعات" description="تطبیق توازن اسناد تأییدشده، مانده خزانه با دفتر حساب و موجودی کالا با گردش انبار">
            <SecondaryButton disabled={busy} onClick={() => run(async () => {
                const response = await authFetch(`${API_BASE_URL}/accounting/api/v2/reconciliation/`);
                if (!response.ok) throw new Error('کنترل تطبیق انجام نشد.');
                setIntegrity(await response.json());
            })}>بررسی تطبیق</SecondaryButton>
            {integrity && <div role="status"><p>{integrity.healthy ? 'در این کنترل، مغایرتی پیدا نشد.' : `${integrity.issue_count} مغایرت نیازمند بررسی است.`}</p>
                <ul>{integrity.issues.map((item,index) => <li key={index}>{item.name} — اختلاف: {item.difference || 'حساب حسابداری مشخص نشده است.'}</li>)}</ul></div>}
        </DataPanel>
        <DataPanel title="پشتیبان‌گیری" description="پشتیبان شامل دیتابیس و پیوست‌هاست. برای تهیه نسخه کاملاً هماهنگ، ثبت عملیات توسط کاربران را موقتاً متوقف کنید.">
            <PrimaryButton disabled={busy} onClick={() => run(async () => {
                const response = await authFetch(`${base}/backups/`, { method: 'POST' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.detail || 'پشتیبان ساخته نشد.');
                await loadBackups(); setMessage('نسخه پشتیبان ساخته و صحت فایل‌ها بررسی شد.');
            })}>{busy ? 'در حال انجام...' : 'ساخت نسخه پشتیبان'}</PrimaryButton>
            {backups.length === 0 ? <p>نسخه پشتیبانی ثبت نشده است.</p> : <ul className={styles.list}>{backups.map(item => <li key={item.name}><span dir="ltr">{new Date(item.created_at * 1000).toLocaleString('fa-IR')} · {(item.size / 1048576).toFixed(2)} MB</span><SecondaryButton disabled={busy} onClick={() => run(() => downloadAuthenticated(`${base}/backups/${item.name}/download/`, item.name))}>دریافت پشتیبان</SecondaryButton></li>)}</ul>}
            <p>بازیابی با توقف برنامه و طبق راهنمای نصب انجام می‌شود. یک نسخه پشتیبان را خارج از سیستم اصلی نگهداری کنید.</p>
        </DataPanel>
    </div>;
}
