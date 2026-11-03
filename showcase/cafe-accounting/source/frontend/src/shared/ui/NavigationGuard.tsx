import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ActionButton } from "./controls";
import { GuardContext, Registration } from "./navigation";

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const registrations = useRef(new Map<string, Registration>());
  const [prompt, setPrompt] = useState<{ action: () => void; blocked: boolean } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const register = useCallback((id: string, state: Registration) => {
    registrations.current.set(id, state);
    return () => { registrations.current.delete(id); };
  }, []);
  const run = useCallback((action: () => void) => {
    const states = [...registrations.current.values()];
    if (states.some((state) => state.dirty || state.blocked)) {
      trigger.current = document.activeElement as HTMLElement;
      setPrompt({ action, blocked: states.some((state) => state.blocked) });
    } else action();
  }, []);
  useEffect(() => {
    function unload(event: BeforeUnloadEvent) {
      if ([...registrations.current.values()].some((state) => state.dirty || state.blocked)) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, []);
  useEffect(() => {
    if (prompt && !dialog.current?.open) { dialog.current?.showModal(); dialog.current?.querySelector<HTMLButtonElement>("button")?.focus(); }
    if (!prompt && dialog.current?.open) {
      dialog.current.close();
      const fallbacks = document.querySelectorAll<HTMLElement>("[data-navigation-focus]");
      const destination = trigger.current?.isConnected ? trigger.current : fallbacks[fallbacks.length - 1];
      destination?.focus({ preventScroll: true });
    }
  }, [prompt]);
  return <GuardContext.Provider value={{ run, register }}>{children}<dialog ref={dialog} className="ui-dialog" aria-labelledby="unsaved-title" aria-describedby="unsaved-description" onCancel={(event) => { event.preventDefault(); setPrompt(null); }}>
    <h2 id="unsaved-title">{prompt?.blocked ? "ابتدا نتیجه ثبت را مشخص کنید" : "تغییرات ذخیره نشده‌اند"}</h2>
    <p id="unsaved-description">{prompt?.blocked ? "عملیات در حال ثبت است یا پاسخ آن مشخص نیست. به فرم برگردید و نتیجه ثبت را بررسی کنید." : "با خروج از این فرم، تغییرات ذخیره‌نشده کنار گذاشته می‌شوند."}</p>
    <div className="ui-actions"><ActionButton intent="secondary" onClick={() => setPrompt(null)}>ادامه ویرایش</ActionButton>{prompt && !prompt.blocked && <ActionButton intent="danger" onClick={() => { const action = prompt.action; setPrompt(null); action(); }}>کنار گذاشتن تغییرات</ActionButton>}</div>
  </dialog></GuardContext.Provider>;
}
