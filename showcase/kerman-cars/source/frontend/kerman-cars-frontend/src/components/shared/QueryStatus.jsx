import { LoaderCircle, TriangleAlert } from 'lucide-react';
import './QueryStatus.scss';
export default function QueryStatus({ query, children }) {
    if (query.isPending) return <div className="query-state query-state--loading" role="status"><LoaderCircle size={22} aria-hidden="true" /><span>در حال دریافت اطلاعات…</span></div>;
    if (query.isError) return <section className="query-state query-state--error" role="alert"><TriangleAlert size={24} aria-hidden="true" /><div><p>{query.error.message}</p><button type="button" className="btn btn-outline-primary" onClick={() => query.refetch()}>تلاش دوباره</button></div></section>;
    return children;
}
