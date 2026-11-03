import ThemeToggle from '../theme/ThemeToggle';
import NotificationLink from '../activity/NotificationLink';
import useHomepage from '../../hooks/useHomepage';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Menu, Plus, Search, UserRound, X } from 'lucide-react';
import logo from '../../assets/images/kerman-cars-logo.webp';
import useAuthStore from '../../store/authStore';
import './PublicHeader.scss';
export default function PublicHeader() {
    const homepage = useHomepage();
    const [menuOpen, setMenuOpen] = useState(false);
    const authenticated = useAuthStore(s => s.isAuthenticated);
    const user = useAuthStore(s => s.user);
    const accountPath = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
    const close = () => setMenuOpen(false);
    return <header className="public-header"><div className="kc-container public-header__inner">
        <NavLink to="/" className="public-header__brand" onClick={close}><img src={logo} alt="KERMAN.CARS" width="48" height="48" /><div><strong>{homepage.data?.settings.site_name || 'KERMAN.CARS'}</strong><span>بازار خودرو کرمان</span></div></NavLink>
        <nav id="public-navigation" aria-label="ناوبری اصلی" className={`public-header__nav ${menuOpen ? 'public-header__nav--open' : ''}`} onKeyDown={event => { if (event.key === 'Escape') { close(); document.getElementById('public-menu-toggle')?.focus(); } }}>
            {[['/', 'صفحه اصلی'], ['/cars', 'خرید خودرو'], ['/dealers', 'نمایشگاه‌ها'], ['/about', 'درباره ما']].map(([to,label]) => <NavLink to={to} end={to === '/'} key={to} onClick={close} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}
            <NavLink className="public-header__mobile-link" to={authenticated ? accountPath : '/auth/login'} onClick={close}>{authenticated ? 'حساب من' : 'ورود یا ثبت‌نام'}</NavLink>
            <NavLink className="public-header__mobile-link" to="/listing/create" onClick={close}>ثبت آگهی</NavLink>
        </nav>
        <div className="public-header__tools"><ThemeToggle /><NotificationLink /><div className="public-header__actions">
            <NavLink to="/cars" className="public-header__icon-button" aria-label="جست‌وجو"><Search size={19} /></NavLink>
            <NavLink to={authenticated ? user?.role === 'ADMIN' ? '/admin' : '/dashboard/favorites' : '/auth/login'} className="public-header__icon-button" aria-label="علاقه‌مندی‌ها"><Heart size={19} /></NavLink>
            <NavLink to={authenticated ? accountPath : '/auth/login'} className="public-header__login"><UserRound size={18} />{authenticated ? user?.role === 'ADMIN' ? 'پنل مدیریت' : user?.firstName || 'حساب من' : 'ورود یا ثبت‌نام'}</NavLink>
            <NavLink to="/listing/create" className="btn btn-primary public-header__create"><Plus size={18} />ثبت آگهی</NavLink>
        </div><button type="button" id="public-menu-toggle" className="public-header__mobile-menu" aria-label="نمایش منو" aria-expanded={menuOpen} aria-controls="public-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
    </div></header>;
}
