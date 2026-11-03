import { useState } from 'react';
import { downloadAuthenticated } from '../../utils/download';
import { SecondaryButton } from '../ERP/ERP';
export default function ReportDownloads({ url, filename = 'report' }) {
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    async function download(format) {
        setBusy(true);setError('');
        try { await downloadAuthenticated(`${url}${url.includes('?')?'&':'?'}export_format=${format}`,`${filename}.${format}`); }
        catch(e) { setError(e.message); } finally { setBusy(false); }
    }
    return <div><SecondaryButton disabled={busy} onClick={()=>download('pdf')}>{busy?'در حال دریافت...':'PDF'}</SecondaryButton>{' '}<SecondaryButton disabled={busy} onClick={()=>download('xlsx')}>Excel</SecondaryButton>{error&&<p role="alert">{error}</p>}</div>;
}
