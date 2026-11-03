export function AvailabilityLabel({ available }: { available: boolean }) {
  return <span className={`item-availability ${available ? "item-availability--available" : "item-availability--unavailable"}`}>{available ? "موجود" : "ناموجود"}</span>;
}
