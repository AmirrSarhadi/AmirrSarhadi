const accountDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tehran",
});
export function formatAccountDate(value: string) { return accountDateFormatter.format(new Date(value)); }
