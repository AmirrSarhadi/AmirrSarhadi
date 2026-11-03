export function ActionIcon({ kind, label }: { kind: "edit" | "delete" | "details" | "confirm" | "skip" | "back"; label: string }) {
  return <span className={`action-icon action-icon--${kind}`} title={label}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === "confirm" ? <path d="m5 12 4 4L19 6"/> : kind === "back" ? <path d="M5 12h14m-6-6 6 6-6 6"/> : kind === "skip" ? <><circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 12-5m3 3 5 5m0-5-5 5"/></> : kind === "details" ? <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></> : kind === "edit" ? <><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></> : <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>}</svg>
    <span className="sr-only">{label}</span>
  </span>;
}
