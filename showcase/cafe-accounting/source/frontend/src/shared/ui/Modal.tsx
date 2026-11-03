import { ReactNode, useEffect, useId, useRef } from "react";
import { useNavigationGuard } from "./navigation";

let scrollLocks = 0;
let previousOverflow = "";

export function Modal({ title, open, onClose, busy = false, guardClose = true, children }: { title: string; open: boolean; onClose: () => void; busy?: boolean; guardClose?: boolean; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null); const titleId = useId();
  const { run } = useNavigationGuard();
  const close = () => { if (!busy) { if (guardClose) run(onClose); else onClose(); } };
  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const trigger = document.activeElement as HTMLElement;
    if (!scrollLocks) previousOverflow = document.body.style.overflow;
    scrollLocks += 1;
    node.showModal(); document.body.style.overflow = "hidden";
    return () => {
      node.close(); scrollLocks -= 1;
      if (!scrollLocks) document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
      else document.querySelector<HTMLElement>("[data-navigation-focus]")?.focus();
    };
  }, [open]);
  if (!open) return null;
  return <dialog ref={dialog} className="app-modal" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) { const b = event.currentTarget.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) close(); } }}>
    <header className="app-modal__header"><h2 id={titleId}>{title}</h2><button type="button" className="app-modal__close" aria-label="بستن پنجره" disabled={busy} onClick={close}>×</button></header>
    <div className="app-modal__body">{children}</div>
  </dialog>;
}
