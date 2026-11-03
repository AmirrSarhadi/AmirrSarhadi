import { authFetch } from '../api/http';
export async function downloadAuthenticated(url, filename) {
    const response = await authFetch(url);
    if (!response.ok) throw new Error('دریافت فایل انجام نشد.');
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
