export function buildInstallmentPreview(balance, count, firstDate, interval = 1) {
  const units = Math.round(Number(balance) * 100);
  count = Number(count);
  interval = Number(interval);
  if (!Number.isSafeInteger(units) || !Number.isInteger(count) || count < 1 || count > 120 ||
      !Number.isInteger(interval) || interval < 1 || interval > 24 || units < count || !firstDate) return [];
  const anchor = new Date(`${firstDate}T00:00:00`);
  if (Number.isNaN(anchor.getTime())) return [];
  const base = Math.floor(units / count);
  const extra = units % count;
  return Array.from({ length: count }, (_, index) => {
    const month = anchor.getMonth() + index * interval;
    const date = new Date(anchor.getFullYear(), month, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(anchor.getDate(), lastDay));
    const dueDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { sequence: index + 1, amount: (base + (index < extra ? 1 : 0)) / 100, dueDate };
  });
}
