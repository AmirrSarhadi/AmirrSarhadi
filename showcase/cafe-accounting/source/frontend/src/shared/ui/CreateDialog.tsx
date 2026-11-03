import { cloneElement, FormEvent, ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { useUnsavedChanges } from "./navigation";

type FormProps = { children?: ReactNode; onSubmit?: (event: FormEvent<HTMLFormElement>) => unknown };
export function CreateDialog({ title, trigger, children, successKey, notice = "", prepare }: { title: string; trigger: string; children: ReactElement<FormProps>; successKey?: unknown; notice?: string; prepare?: () => Promise<void> }) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false);
  const [preparing, setPreparing] = useState(false); const [prepareError, setPrepareError] = useState("");
  const preparingRef = useRef(false);
  const [readyToOpen, setReadyToOpen] = useState(false);
  async function show() {
    if (!prepare) { setOpen(true); return; }
    if (preparingRef.current) return;
    preparingRef.current = true; setPreparing(true); setPrepareError("");
    try {
      await prepare();
      setReadyToOpen(true);
    } catch { setPrepareError("دریافت اطلاعات تازه انجام نشد؛ دوباره تلاش کنید."); preparingRef.current = false; setPreparing(false); }
  }
  const previous = useRef(successKey);
  useUnsavedChanges(open && dirty, open && busy);
  function close() { setOpen(false); setDirty(false); }
  useEffect(() => {
    if (previous.current !== successKey) {
      previous.current = successKey;
      // Synchronize an acknowledged server success with the modal lifecycle.
      if (!preparingRef.current) { setOpen(false); setDirty(false); }
    }
  }, [successKey]);
  useEffect(() => {
    if (!readyToOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      previous.current = successKey; preparingRef.current = false;
      setPreparing(false); setReadyToOpen(false); setOpen(true);
    });
    return () => { cancelled = true; };
  }, [readyToOpen, successKey]);
  const form = cloneElement(children, { onSubmit: async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return; setBusy(true);
    try { await children.props.onSubmit?.(event); } finally { setBusy(false); }
  }, children: <fieldset className="modal-fields" disabled={busy}>{children.props.children}</fieldset> });
  return <div className="create-action"><button type="button" className="button button--primary create-trigger" disabled={preparing} aria-busy={preparing} onClick={() => void show()}><span aria-hidden="true">＋</span>{trigger}</button>{prepareError && <span role="alert">{prepareError}</span>}
    <Modal title={title} open={open} onClose={close} busy={busy}>
      <div onChangeCapture={() => setDirty(true)} onResetCapture={close}>{notice.includes("نشد") && <p className={notice.includes("نشد") ? "alert alert--error" : "alert alert--success"} role={notice.includes("نشد") ? "alert" : "status"}>{notice}</p>}{form}</div>
    </Modal>
  </div>;
}
