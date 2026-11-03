import { useEffect, useRef, useId } from "react";

export default function ConfirmDialog({
    title,
    children,
    pending,
    onCancel,
    onConfirm,
    confirmLabel = "تأیید",
    confirmDisabled = false,
    intent = "danger",
}) {
    const ref = useRef(null);
    const titleId = useId();
    useEffect(() => {
        const dialog = ref.current;
        const previousFocus = document.activeElement;
        dialog.showModal();
        dialog.querySelector("button").focus();
        return () => {
            dialog.close();
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
    }, []);
    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                if (!pending) onCancel();
            }}
            className="kc-dialog p-4"
            style={{ maxWidth: "min(480px, 95vw)" }}
        >
            <h2 id={titleId}>{title}</h2>
            <div>{children}</div>
            <div className="d-flex gap-3 mt-4">
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={pending}
                    onClick={onCancel}
                >
                    انصراف
                </button>
                <button
                    type="button"
                    className={`btn ${intent === "primary" ? "btn-primary" : "btn-danger"}`}
                    disabled={pending || confirmDisabled}
                    onClick={onConfirm}
                >
                    {pending ? "در حال انجام…" : confirmLabel}
                </button>
            </div>
        </dialog>
    );
}
