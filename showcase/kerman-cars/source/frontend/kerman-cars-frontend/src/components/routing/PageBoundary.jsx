import { Component } from 'react';
export default class PageBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        if (this.state.failed) return <section role="alert" className="kc-container py-5"><h1>صفحه باز نشد</h1><p>اتصال را بررسی کنید و صفحه را دوباره بارگذاری کنید.</p><button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>بارگذاری دوباره</button><a className="btn btn-outline-primary me-2" href="/">صفحه اصلی</a></section>;
        return this.props.children;
    }
}
