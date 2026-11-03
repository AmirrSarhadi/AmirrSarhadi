import { useEffect, useState } from 'react';
import { API_BASE_URL, authFetch } from '../../../api/http';
import { getAllPages } from '../../../api/lists';
import { PageHero, DataPanel, PrimaryButton } from '../../../components/ERP/ERP';
import useModulePermission from '../../../hooks/useModulePermission';
import styles from '../../Settings/CommercialTools/CommercialTools.module.css';

export default function TreasuryOpening() {
    const { canWrite, disabledReason } = useModulePermission('banking');
    const [data, setData] = useState({ years: [], accounts: [], bank: [], cashbox: [], imprest: [] });
    const [form, setForm] = useState({ treasury_type: 'bank', treasury_id: '', fiscal_year_id: '', counterpart_account_id: '', amount: '' });
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    useEffect(() => {
        Promise.all([
            getAllPages(`${API_BASE_URL}/accounting/api/v2/fiscal-years/`),
            getAllPages(`${API_BASE_URL}/accounting/api/v2/accounts/`),
            ...['banks', 'cashboxes', 'imprests'].map(kind => getAllPages(`${API_BASE_URL}/banking/api/v2/${kind}/`)),
        ]).then(results => { const [years, accounts, bank, cashbox, imprest] = results.map(response => Array.isArray(response.data) ? response.data : response.data?.results || []); setData({ years, accounts, bank, cashbox, imprest }); })
            .catch(() => setError('اطلاعات اولیه دریافت نشد؛ صفحه را دوباره باز کنید.')).finally(() => setBusy(false));
    }, []);
    const change = (key, value) => { setResult(null); setForm(prev => ({ ...prev, [key]: value, ...(key === 'treasury_type' ? { treasury_id: '' } : {}) })); };
    async function submit(event) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const response = await authFetch(`${API_BASE_URL}/banking/api/v2/opening-balances/`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
            const value = await response.json();
            if (!response.ok) throw new Error(JSON.stringify(value.detail || value));
            setResult(value);
        } catch(e) { setError(e.message); } finally { setBusy(false); }
    }
    return <div className={styles.page}><PageHero title="مانده افتتاحیه خزانه" description="ثبت اولین مانده همراه با سند حسابداری متوازن" />
        <DataPanel title="افتتاحیه بانک، صندوق یا تنخواه" description="فقط برای خزانه ریالی با مانده صفر و حساب اختصاصی بدون گردش استفاده کنید. ثبت این عملیات سند را تأیید و قفل می‌کند.">
            {error && <p className={styles.error} role="alert">{error}</p>}
            {result && <p role="status">افتتاحیه ثبت شد؛ شماره شناسه سند: {result.document_id}</p>}
            <form className={styles.form} onSubmit={submit}>
                <label>نوع خزانه<select value={form.treasury_type} disabled={busy || !canWrite} onChange={e => change('treasury_type',e.target.value)}><option value="bank">بانک</option><option value="cashbox">صندوق</option><option value="imprest">تنخواه</option></select></label>
                <label>خزانه<select required value={form.treasury_id} disabled={busy || !canWrite} onChange={e => change('treasury_id',e.target.value)}><option value="">انتخاب کنید</option>{data[form.treasury_type].map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>سال مالی<select required value={form.fiscal_year_id} disabled={busy || !canWrite} onChange={e => change('fiscal_year_id',e.target.value)}><option value="">انتخاب کنید</option>{data.years.filter(item => !item.is_closed).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>حساب مقابل افتتاحیه<select required value={form.counterpart_account_id} disabled={busy || !canWrite} onChange={e => change('counterpart_account_id',e.target.value)}><option value="">انتخاب کنید</option>{data.accounts.filter(item => item.is_postable).map(item => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
                <label>مانده به ریال<input required type="number" min="1" max="999999999999" step="1" value={form.amount} disabled={busy || !canWrite} onChange={e => change('amount',e.target.value)} /></label>
                <PrimaryButton type="submit" disabled={busy || !canWrite || Boolean(result)} title={!canWrite ? disabledReason : undefined}>{busy ? 'در حال انجام...' : 'ثبت قطعی افتتاحیه'}</PrimaryButton>
            </form>
        </DataPanel>
    </div>;
}
