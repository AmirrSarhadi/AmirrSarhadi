import { useEffect, useState } from 'react';
import { API_BASE_URL, authFetch } from '../../../api/http';
import { getAllPages } from '../../../api/lists';
import { DataPanel, PrimaryButton } from '../../../components/ERP/ERP';
import styles from './CommercialTools.module.css';
export default function InitialMasterForm() {
    const [data,setData]=useState({years:[],accounts:[],customers:[],vendors:[],materials:[],warehouses:[]});
    const [form,setForm]=useState({kind:'person',person_type:'customer',person_id:'',side:'debit',amount:'',warehouse_id:'',material_id:'',stock_account_id:'',quantity:'',unit_cost:'',fiscal_year_id:'',counterpart_account_id:''});
    const [busy,setBusy]=useState(true),[error,setError]=useState(''),[result,setResult]=useState(null);
    useEffect(()=>{
        const urls=['/accounting/api/v2/fiscal-years/','/accounting/api/v2/accounts/','/persons/api/v2/customer_list/','/persons/api/v2/vendor_list/','/services/api/v2/materials/','/warehousing/api/v2/warehouses/'];
        Promise.all(urls.map(url=>getAllPages(`${API_BASE_URL}${url}`))).then(responses=>{
            const [years,accounts,customers,vendors,materials,warehouses]=responses.map(r=>Array.isArray(r.data)?r.data:r.data?.results||[]);
            setData({years,accounts,customers,vendors,materials,warehouses});
        }).catch(()=>setError('اطلاعات افتتاحیه دریافت نشد؛ صفحه را دوباره باز کنید.')).finally(()=>setBusy(false));
    },[]);
    const change=(key,value)=>{setResult(null);setForm(prev=>({...prev,[key]:value}));};
    function select(key,label,rows,getLabel) { return <label>{label}<select required value={form[key]} disabled={busy} onChange={e=>change(key,e.target.value)}><option value="">انتخاب کنید</option>{rows.map(item=><option key={item.id} value={item.id}>{getLabel(item)}</option>)}</select></label>; }
    function amount(key,label,step) { return <label>{label}<input required type="number" min={step} step={step} value={form[key]} disabled={busy} onChange={e=>change(key,e.target.value)} /></label>; }
    async function submit(e) {
        e.preventDefault();setBusy(true);setError('');
        const keys=form.kind==='person'?['person_type','person_id','side','amount']:['warehouse_id','material_id','stock_account_id','quantity','unit_cost'];
        const payload=Object.fromEntries(['kind','fiscal_year_id','counterpart_account_id',...keys].map(key=>[key,form[key]]));
        try {
            const response=await authFetch(`${API_BASE_URL}/settings/api/v2/initial-balances/`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            const value=await response.json();if(!response.ok)throw new Error(JSON.stringify(value.detail||value));setResult(value);
        } catch(e){setError(e.message);}finally{setBusy(false);}
    }
    return <DataPanel title="افتتاحیه اشخاص و کالا" description="برای اطلاعات اولیه ریالی بدون گردش قبلی؛ ثبت مانده یا ارزش کالا همراه با سند حسابداری انجام می‌شود.">
        {error&&<p className={styles.error} role="alert">{error}</p>}{result&&<p role="status">افتتاحیه ثبت شد؛ شناسه سند: {result.document_id}</p>}
        <form className={styles.form} onSubmit={submit}>
            <label>نوع افتتاحیه<select value={form.kind} disabled={busy} onChange={e=>change('kind',e.target.value)}><option value="person">اشخاص</option><option value="stock">کالا در انبار</option></select></label>
            {select('fiscal_year_id','سال مالی',data.years.filter(i=>!i.is_closed),i=>i.name)}
            {select('counterpart_account_id','حساب مقابل افتتاحیه',data.accounts.filter(i=>i.is_postable),i=>`${i.code} — ${i.name}`)}
            {form.kind==='person'?<>
                <label>نوع شخص<select value={form.person_type} disabled={busy} onChange={e=>{change('person_type',e.target.value);change('person_id','');}}><option value="customer">مشتری</option><option value="vendor">تأمین‌کننده</option></select></label>
                {select('person_id','طرف حساب',form.person_type==='customer'?data.customers:data.vendors,i=>i.company||`${i.first_name||''} ${i.last_name||''} — ${i.code}`)}
                <label>نوع مانده<select value={form.side} disabled={busy} onChange={e=>change('side',e.target.value)}><option value="debit">بدهکار</option><option value="credit">بستانکار</option></select></label>
                {amount('amount','مانده به ریال','0.01')}
            </>:<>
                {select('warehouse_id','انبار',data.warehouses,i=>i.name)}
                {select('material_id','کالا',data.materials,i=>i.persian_name)}
                {select('stock_account_id','حساب موجودی کالا',data.accounts.filter(i=>i.is_postable&&i.type==='ASSET'),i=>`${i.code} — ${i.name}`)}
                {amount('quantity','تعداد اولیه','0.001')}{amount('unit_cost','بهای هر واحد به ریال','0.01')}
            </>}
            <PrimaryButton type="submit" disabled={busy||Boolean(result)}>{busy?'در حال انجام...':'ثبت قطعی افتتاحیه'}</PrimaryButton>
        </form>
    </DataPanel>;
}
