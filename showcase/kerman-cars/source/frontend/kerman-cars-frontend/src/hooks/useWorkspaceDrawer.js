import { useEffect } from 'react';
// The same mobile navigation contract is used by all three workspace shells.
export default function useWorkspaceDrawer(open, setOpen, prefix, label) {
    useEffect(() => {
        const media = window.matchMedia('(max-width: 991.98px)');
        const resized = () => setOpen(false);
        media.addEventListener('change', resized);
        if (!open || !media.matches) return () => media.removeEventListener('change', resized);
        const drawer = document.querySelector(`.${prefix}-sidebar`);
        const content = document.querySelector(`.${prefix}-layout__content`);
        const trigger = document.activeElement;
        const overflow = document.body.style.overflow;
        const wasInert = content?.inert;
        if (content) content.inert = true;
        document.body.style.overflow = 'hidden';
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('aria-label', label);
        const controls = () => [...drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')].filter(node => node.getClientRects().length);
        (drawer.querySelector(`.${prefix}-sidebar__close`) || controls()[0])?.focus();
        const keydown = event => {
            if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
            if (event.key !== 'Tab') return;
            const elements = controls(), first = elements[0], last = elements.at(-1);
            if (!elements.length) return;
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', keydown);
        return () => {
            media.removeEventListener('change', resized); document.removeEventListener('keydown', keydown);
            document.body.style.overflow = overflow;
            if (content) content.inert = wasInert;
            drawer.removeAttribute('role'); drawer.removeAttribute('aria-modal'); drawer.removeAttribute('aria-label');
            if (trigger?.isConnected) trigger.focus();
        };
    }, [open, setOpen, prefix, label]);
}
